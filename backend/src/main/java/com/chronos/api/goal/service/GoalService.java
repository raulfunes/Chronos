package com.chronos.api.goal.service;

import com.chronos.api.common.exception.NotFoundException;
import com.chronos.api.goal.dto.GoalRequest;
import com.chronos.api.goal.dto.GoalResponse;
import com.chronos.api.goal.model.Goal;
import com.chronos.api.goal.model.GoalStatus;
import com.chronos.api.goal.repository.GoalRepository;
import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.repository.FocusSessionRepository;
import com.chronos.api.task.model.TaskItem;
import com.chronos.api.task.model.TaskStatus;
import com.chronos.api.task.repository.TaskRepository;
import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.repository.AppUserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GoalService {

    private static final Logger log = LoggerFactory.getLogger(GoalService.class);

    private final GoalRepository goalRepository;
    private final AppUserRepository appUserRepository;
    private final TaskRepository taskRepository;
    private final FocusSessionRepository focusSessionRepository;

    public GoalService(
        GoalRepository goalRepository,
        AppUserRepository appUserRepository,
        TaskRepository taskRepository,
        FocusSessionRepository focusSessionRepository
    ) {
        this.goalRepository = goalRepository;
        this.appUserRepository = appUserRepository;
        this.taskRepository = taskRepository;
        this.focusSessionRepository = focusSessionRepository;
    }

    @Transactional(readOnly = true)
    public List<GoalResponse> findAll(Long userId) {
        return goalRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public GoalResponse create(Long userId, GoalRequest request) {
        Goal goal = new Goal();
        goal.setUser(getUser(userId));
        apply(goal, request);
        Goal savedGoal = goalRepository.save(goal);
        log.info(
            "Created goal userId={} goalId={} status={} priority={}",
            userId,
            savedGoal.getId(),
            savedGoal.getStatus(),
            savedGoal.getPriority()
        );
        return toResponse(savedGoal);
    }

    @Transactional
    public GoalResponse update(Long userId, Long goalId, GoalRequest request) {
        Goal goal = getOwnedGoal(userId, goalId);
        GoalStatus previousStatus = goal.getStatus();
        apply(goal, request);
        Goal savedGoal = goalRepository.save(goal);
        log.info(
            "Updated goal userId={} goalId={} previousStatus={} nextStatus={} priority={}",
            userId,
            savedGoal.getId(),
            previousStatus,
            savedGoal.getStatus(),
            savedGoal.getPriority()
        );
        return toResponse(savedGoal);
    }

    @Transactional
    public void delete(Long userId, Long goalId) {
        Goal goal = getOwnedGoal(userId, goalId);
        goalRepository.delete(goal);
        log.info("Deleted goal userId={} goalId={}", userId, goal.getId());
    }

    @Transactional(readOnly = true)
    public GoalResponse toResponse(Goal goal) {
        List<TaskItem> tasks = taskRepository.findAllByUserIdOrderByCreatedAtDesc(goal.getUser().getId()).stream()
            .filter(task -> task.getGoal() != null && task.getGoal().getId().equals(goal.getId()))
            .toList();
        long taskCount = tasks.size();
        long completedTaskCount = tasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count();
        var sessions = focusSessionRepository.findAllByUserIdOrderByScheduledForAscCreatedAtAsc(goal.getUser().getId()).stream()
            .filter(session -> session.getGoal() != null && session.getGoal().getId().equals(goal.getId()))
            .toList();
        long totalSessions = sessions.size();
        long completedSessions = sessions.stream().filter(session -> session.getStatus() == SessionStatus.COMPLETED).count();
        int progress = taskCount == 0 ? (goal.getStatus() == GoalStatus.DONE ? 100 : 0) : (int) ((completedTaskCount * 100) / taskCount);
        return new GoalResponse(
            goal.getId(),
            goal.getTitle(),
            goal.getDescription(),
            goal.getStatus(),
            goal.getPriority(),
            goal.getTargetDate(),
            progress,
            taskCount,
            completedTaskCount,
            totalSessions,
            completedSessions,
            goal.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public Goal getOwnedGoal(Long userId, Long goalId) {
        Goal goal = goalRepository.findById(goalId).orElseThrow(() -> new NotFoundException("Goal not found"));
        if (!goal.getUser().getId().equals(userId)) {
            throw new NotFoundException("Goal not found");
        }
        return goal;
    }

    private void apply(Goal goal, GoalRequest request) {
        goal.setTitle(request.title());
        goal.setDescription(request.description());
        goal.setPriority(request.priority() == null ? goal.getPriority() : request.priority());
        goal.setStatus(request.status() == null ? goal.getStatus() : request.status());
        goal.setTargetDate(request.targetDate());
    }

    private AppUser getUser(Long userId) {
        return appUserRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
    }
}
