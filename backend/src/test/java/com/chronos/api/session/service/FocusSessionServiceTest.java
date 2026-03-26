package com.chronos.api.session.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.chronos.api.auth.dto.RegisterRequest;
import com.chronos.api.auth.service.AuthService;
import com.chronos.api.session.dto.FocusSessionRequest;
import com.chronos.api.session.dto.FocusSessionResponse;
import com.chronos.api.session.model.FocusSession;
import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.model.SessionType;
import com.chronos.api.session.repository.FocusSessionRepository;
import com.chronos.api.task.model.TaskItem;
import com.chronos.api.task.model.TaskStatus;
import com.chronos.api.task.repository.TaskRepository;
import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.repository.AppUserRepository;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class FocusSessionServiceTest {

    @Autowired
    private FocusSessionService focusSessionService;

    @Autowired
    private FocusSessionRepository focusSessionRepository;

    @Autowired
    private AppUserRepository appUserRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private AuthService authService;

    @Test
    void createRunningSessionInitializesTimerState() {
        AppUser user = createUser("running-init@example.com");

        FocusSessionResponse response = focusSessionService.create(
            user.getId(),
            request(null, null, SessionType.POMODORO, SessionStatus.RUNNING, 25)
        );

        assertThat(response.status()).isEqualTo(SessionStatus.RUNNING);
        assertThat(response.remainingSeconds()).isEqualTo(1500);
        assertThat(response.startedAt()).isNotNull();
        assertThat(response.lastResumedAt()).isNotNull();
        assertThat(response.completedAt()).isNull();
    }

    @Test
    void pauseRunningSessionPersistsElapsedProgress() {
        AppUser user = createUser("pause-progress@example.com");
        FocusSessionResponse created = focusSessionService.create(
            user.getId(),
            request(null, null, SessionType.POMODORO, SessionStatus.RUNNING, 25)
        );

        FocusSession runningSession = focusSessionRepository.findById(created.id()).orElseThrow();
        Instant initialStartedAt = runningSession.getStartedAt();
        runningSession.setLastResumedAt(Instant.now().minusSeconds(90));
        focusSessionRepository.save(runningSession);

        FocusSessionResponse paused = focusSessionService.update(
            user.getId(),
            created.id(),
            request(null, null, SessionType.POMODORO, SessionStatus.PAUSED, 25)
        );

        assertThat(paused.status()).isEqualTo(SessionStatus.PAUSED);
        assertThat(paused.remainingSeconds()).isBetween(1408, 1410);
        assertThat(paused.lastResumedAt()).isNull();
        assertThat(paused.startedAt()).isEqualTo(initialStartedAt);
    }

    @Test
    void resumePausedSessionKeepsRemainingTime() {
        AppUser user = createUser("resume-session@example.com");
        FocusSessionResponse created = focusSessionService.create(
            user.getId(),
            request(null, null, SessionType.POMODORO, SessionStatus.RUNNING, 25)
        );

        FocusSession runningSession = focusSessionRepository.findById(created.id()).orElseThrow();
        Instant initialStartedAt = runningSession.getStartedAt();
        runningSession.setLastResumedAt(Instant.now().minusSeconds(90));
        focusSessionRepository.save(runningSession);

        FocusSessionResponse paused = focusSessionService.update(
            user.getId(),
            created.id(),
            request(null, null, SessionType.POMODORO, SessionStatus.PAUSED, 25)
        );

        FocusSessionResponse resumed = focusSessionService.update(
            user.getId(),
            created.id(),
            request(null, null, SessionType.POMODORO, SessionStatus.RUNNING, 25)
        );

        assertThat(resumed.status()).isEqualTo(SessionStatus.RUNNING);
        assertThat(resumed.remainingSeconds()).isEqualTo(paused.remainingSeconds());
        assertThat(resumed.startedAt()).isEqualTo(initialStartedAt);
        assertThat(resumed.lastResumedAt()).isNotNull();
        assertThat(resumed.completedAt()).isNull();
    }

    @Test
    void completeSessionZerosRemainingTimeAndMarksTaskDone() {
        AppUser user = createUser("complete-task@example.com");
        TaskItem task = createTask(user, "Ship timer recovery");
        FocusSessionResponse created = focusSessionService.create(
            user.getId(),
            request(null, task.getId(), SessionType.POMODORO, SessionStatus.RUNNING, 25)
        );

        FocusSessionResponse completed = focusSessionService.complete(user.getId(), created.id());

        assertThat(completed.status()).isEqualTo(SessionStatus.COMPLETED);
        assertThat(completed.remainingSeconds()).isZero();
        assertThat(completed.completedAt()).isNotNull();
        assertThat(taskRepository.findById(task.getId()).orElseThrow().getStatus()).isEqualTo(TaskStatus.DONE);
    }

    @Test
    void startingAnotherRunningSessionAutoPausesPreviousOne() {
        AppUser user = createUser("auto-pause@example.com");
        FocusSessionResponse firstSession = focusSessionService.create(
            user.getId(),
            request(null, null, SessionType.POMODORO, SessionStatus.RUNNING, 25)
        );

        FocusSession persistedFirstSession = focusSessionRepository.findById(firstSession.id()).orElseThrow();
        persistedFirstSession.setLastResumedAt(Instant.now().minusSeconds(60));
        focusSessionRepository.save(persistedFirstSession);

        FocusSessionResponse secondSession = focusSessionService.create(
            user.getId(),
            request(null, null, SessionType.SHORT_BREAK, SessionStatus.RUNNING, 5)
        );

        FocusSession pausedFirstSession = focusSessionRepository.findById(firstSession.id()).orElseThrow();

        assertThat(pausedFirstSession.getStatus()).isEqualTo(SessionStatus.PAUSED);
        assertThat(pausedFirstSession.getLastResumedAt()).isNull();
        assertThat(pausedFirstSession.getRemainingSeconds()).isBetween(1438, 1440);
        assertThat(secondSession.status()).isEqualTo(SessionStatus.RUNNING);
        assertThat(secondSession.remainingSeconds()).isEqualTo(300);
    }

    private AppUser createUser(String email) {
        Long userId = authService.register(new RegisterRequest("Chronos Tester", email, "password123")).userId();
        return appUserRepository.findById(userId).orElseThrow();
    }

    private TaskItem createTask(AppUser user, String title) {
        TaskItem task = new TaskItem();
        task.setUser(user);
        task.setTitle(title);
        task.setStatus(TaskStatus.TODO);
        task.setEstimatedSessions(1);
        return taskRepository.save(task);
    }

    private FocusSessionRequest request(
        Long goalId,
        Long taskId,
        SessionType type,
        SessionStatus status,
        int durationMinutes
    ) {
        return new FocusSessionRequest(goalId, taskId, type, status, durationMinutes, Instant.now());
    }
}
