package com.chronos.api.session.service;

import com.chronos.api.common.exception.NotFoundException;
import com.chronos.api.goal.model.Goal;
import com.chronos.api.goal.service.GoalService;
import com.chronos.api.session.dto.FocusSessionRequest;
import com.chronos.api.session.dto.FocusSessionResponse;
import com.chronos.api.session.model.FocusSession;
import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.repository.FocusSessionRepository;
import com.chronos.api.task.model.TaskItem;
import com.chronos.api.task.model.TaskStatus;
import com.chronos.api.task.service.TaskService;
import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.repository.AppUserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FocusSessionService {

    private static final Logger log = LoggerFactory.getLogger(FocusSessionService.class);
    private static final int SECONDS_PER_MINUTE = 60;

    private final FocusSessionRepository focusSessionRepository;
    private final AppUserRepository appUserRepository;
    private final GoalService goalService;
    private final TaskService taskService;

    public FocusSessionService(
        FocusSessionRepository focusSessionRepository,
        AppUserRepository appUserRepository,
        GoalService goalService,
        TaskService taskService
    ) {
        this.focusSessionRepository = focusSessionRepository;
        this.appUserRepository = appUserRepository;
        this.goalService = goalService;
        this.taskService = taskService;
    }

    @Transactional(readOnly = true)
    public List<FocusSessionResponse> findAll(Long userId) {
        return focusSessionRepository.findAllByUserIdOrderByScheduledForAscCreatedAtAsc(userId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public FocusSessionResponse create(Long userId, FocusSessionRequest request) {
        FocusSession session = new FocusSession();
        session.setUser(getUser(userId));
        apply(userId, session, request, true);
        FocusSession savedSession = focusSessionRepository.save(session);
        log.info(
            "Created focus session userId={} sessionId={} status={} type={} durationMinutes={} goalId={} taskId={}",
            userId,
            savedSession.getId(),
            savedSession.getStatus(),
            savedSession.getType(),
            savedSession.getDurationMinutes(),
            savedSession.getGoal() == null ? null : savedSession.getGoal().getId(),
            savedSession.getTask() == null ? null : savedSession.getTask().getId()
        );
        return toResponse(savedSession);
    }

    @Transactional
    public FocusSessionResponse update(Long userId, Long sessionId, FocusSessionRequest request) {
        FocusSession session = getOwnedSession(userId, sessionId);
        SessionStatus previousStatus = session.getStatus();
        apply(userId, session, request, false);
        FocusSession savedSession = focusSessionRepository.save(session);
        log.info(
            "Updated focus session userId={} sessionId={} previousStatus={} nextStatus={} type={} durationMinutes={}",
            userId,
            savedSession.getId(),
            previousStatus,
            savedSession.getStatus(),
            savedSession.getType(),
            savedSession.getDurationMinutes()
        );
        return toResponse(savedSession);
    }

    @Transactional
    public FocusSessionResponse complete(Long userId, Long sessionId) {
        FocusSession session = getOwnedSession(userId, sessionId);
        completeSessionState(session, Instant.now());
        if (session.getTask() != null) {
            session.getTask().setStatus(TaskStatus.DONE);
        }
        FocusSession savedSession = focusSessionRepository.save(session);
        log.info(
            "Completed focus session userId={} sessionId={} taskId={} taskMarkedDone={}",
            userId,
            savedSession.getId(),
            savedSession.getTask() == null ? null : savedSession.getTask().getId(),
            savedSession.getTask() != null
        );
        return toResponse(savedSession);
    }

    @Transactional
    public void delete(Long userId, Long sessionId) {
        FocusSession session = getOwnedSession(userId, sessionId);
        focusSessionRepository.delete(session);
        log.info("Deleted focus session userId={} sessionId={} status={}", userId, session.getId(), session.getStatus());
    }

    @Transactional(readOnly = true)
    public FocusSession getOwnedSession(Long userId, Long sessionId) {
        FocusSession session = focusSessionRepository.findById(sessionId)
            .orElseThrow(() -> new NotFoundException("Session not found"));
        if (!session.getUser().getId().equals(userId)) {
            throw new NotFoundException("Session not found");
        }
        return session;
    }

    @Transactional(readOnly = true)
    public FocusSessionResponse toResponse(FocusSession session) {
        Goal goal = session.getGoal();
        TaskItem task = session.getTask();
        return new FocusSessionResponse(
            session.getId(),
            goal == null ? null : goal.getId(),
            goal == null ? null : goal.getTitle(),
            task == null ? null : task.getId(),
            task == null ? null : task.getTitle(),
            session.getType(),
            session.getStatus(),
            session.getDurationMinutes(),
            session.getRemainingSeconds(),
            session.getScheduledFor(),
            session.getStartedAt(),
            session.getLastResumedAt(),
            session.getCompletedAt(),
            session.getCreatedAt()
        );
    }

    private void apply(Long userId, FocusSession session, FocusSessionRequest request, boolean isNew) {
        SessionStatus previousStatus = session.getStatus();
        Instant now = Instant.now();

        session.setType(request.type());
        session.setStatus(request.status() == null ? session.getStatus() : request.status());
        session.setDurationMinutes(request.durationMinutes() == null ? session.getDurationMinutes() : request.durationMinutes());
        session.setScheduledFor(request.scheduledFor());
        session.setGoal(request.goalId() == null ? null : goalService.getOwnedGoal(userId, request.goalId()));
        session.setTask(request.taskId() == null ? null : taskService.getOwnedTask(userId, request.taskId()));

        if (isNew) {
            session.setRemainingSeconds(durationToSeconds(session.getDurationMinutes()));
            session.setLastResumedAt(null);
            session.setCompletedAt(null);
        } else if (session.getRemainingSeconds() == null) {
            session.setRemainingSeconds(durationToSeconds(session.getDurationMinutes()));
        }

        if (!isNew && request.durationMinutes() != null && session.getStartedAt() == null && previousStatus != SessionStatus.RUNNING) {
            session.setRemainingSeconds(durationToSeconds(session.getDurationMinutes()));
        }

        SessionStatus nextStatus = request.status() == null ? previousStatus : request.status();
        applyStatusTransition(userId, session, previousStatus, nextStatus, now);
    }

    private void applyStatusTransition(Long userId, FocusSession session, SessionStatus previousStatus, SessionStatus nextStatus, Instant now) {
        switch (nextStatus) {
            case RUNNING -> resumeSession(userId, session, now);
            case PAUSED -> pauseSession(session, previousStatus, now);
            case COMPLETED -> completeSessionState(session, now);
            case CANCELLED -> cancelSession(session, previousStatus, now);
            case SCHEDULED -> scheduleSession(session);
        }
    }

    private AppUser getUser(Long userId) {
        return appUserRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
    }

    private void resumeSession(Long userId, FocusSession session, Instant now) {
        autoPauseOtherRunningSessions(userId, session.getId(), now);
        session.setStatus(SessionStatus.RUNNING);
        if (session.getStartedAt() == null) {
            session.setStartedAt(now);
        }
        if (session.getRemainingSeconds() == null || session.getRemainingSeconds() <= 0) {
            session.setRemainingSeconds(durationToSeconds(session.getDurationMinutes()));
        }
        session.setCompletedAt(null);
        session.setLastResumedAt(now);
    }

    private void pauseSession(FocusSession session, SessionStatus previousStatus, Instant now) {
        if (previousStatus == SessionStatus.RUNNING) {
            session.setRemainingSeconds(calculateRemainingSeconds(session, now));
        } else if (session.getRemainingSeconds() == null) {
            session.setRemainingSeconds(durationToSeconds(session.getDurationMinutes()));
        }
        session.setStatus(SessionStatus.PAUSED);
        session.setLastResumedAt(null);
        session.setCompletedAt(null);
    }

    private void completeSessionState(FocusSession session, Instant now) {
        session.setStatus(SessionStatus.COMPLETED);
        if (session.getStartedAt() == null) {
            session.setStartedAt(now);
        }
        session.setRemainingSeconds(0);
        session.setLastResumedAt(null);
        session.setCompletedAt(now);
    }

    private void cancelSession(FocusSession session, SessionStatus previousStatus, Instant now) {
        if (previousStatus == SessionStatus.RUNNING) {
            session.setRemainingSeconds(calculateRemainingSeconds(session, now));
        } else if (session.getRemainingSeconds() == null) {
            session.setRemainingSeconds(durationToSeconds(session.getDurationMinutes()));
        }
        session.setStatus(SessionStatus.CANCELLED);
        session.setLastResumedAt(null);
        session.setCompletedAt(null);
    }

    private void scheduleSession(FocusSession session) {
        if (session.getStartedAt() == null || session.getRemainingSeconds() == null) {
            session.setRemainingSeconds(durationToSeconds(session.getDurationMinutes()));
        }
        session.setStatus(SessionStatus.SCHEDULED);
        session.setLastResumedAt(null);
        session.setCompletedAt(null);
    }

    private void autoPauseOtherRunningSessions(Long userId, Long sessionId, Instant now) {
        List<FocusSession> runningSessions = focusSessionRepository.findAllByUserIdAndStatus(userId, SessionStatus.RUNNING);
        boolean hasChanges = false;
        for (FocusSession runningSession : runningSessions) {
            if (sessionId != null && sessionId.equals(runningSession.getId())) {
                continue;
            }
            pauseSession(runningSession, SessionStatus.RUNNING, now);
            hasChanges = true;
        }
        if (hasChanges) {
            focusSessionRepository.saveAll(runningSessions);
            log.info(
                "Auto-paused running sessions userId={} triggeringSessionId={} pausedCount={}",
                userId,
                sessionId,
                runningSessions.stream().filter(runningSession -> !runningSession.getId().equals(sessionId)).count()
            );
        }
    }

    private int calculateRemainingSeconds(FocusSession session, Instant now) {
        int currentRemainingSeconds = session.getRemainingSeconds() == null
            ? durationToSeconds(session.getDurationMinutes())
            : session.getRemainingSeconds();

        if (session.getLastResumedAt() == null) {
            return currentRemainingSeconds;
        }

        long elapsedSeconds = Math.max(0, Duration.between(session.getLastResumedAt(), now).getSeconds());
        return Math.max(0, currentRemainingSeconds - (int) elapsedSeconds);
    }

    private int durationToSeconds(Integer durationMinutes) {
        return durationMinutes * SECONDS_PER_MINUTE;
    }
}
