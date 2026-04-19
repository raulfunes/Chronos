package com.chronos.api.task.service;

import com.chronos.api.common.exception.NotFoundException;
import com.chronos.api.goal.model.Goal;
import com.chronos.api.goal.service.GoalService;
import com.chronos.api.task.dto.TaskRequest;
import com.chronos.api.task.dto.TaskResponse;
import com.chronos.api.task.model.TaskItem;
import com.chronos.api.session.repository.FocusSessionRepository;
import com.chronos.api.task.repository.TaskRepository;
import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.repository.AppUserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

    private static final Logger log = LoggerFactory.getLogger(TaskService.class);

    private final TaskRepository taskRepository;
    private final AppUserRepository appUserRepository;
    private final GoalService goalService;
    private final FocusSessionRepository focusSessionRepository;

    public TaskService(
        TaskRepository taskRepository,
        AppUserRepository appUserRepository,
        GoalService goalService,
        FocusSessionRepository focusSessionRepository
    ) {
        this.taskRepository = taskRepository;
        this.appUserRepository = appUserRepository;
        this.goalService = goalService;
        this.focusSessionRepository = focusSessionRepository;
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> findAll(Long userId) {
        return taskRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public TaskResponse create(Long userId, TaskRequest request) {
        TaskItem task = new TaskItem();
        task.setUser(getUser(userId));
        apply(userId, task, request);
        TaskItem savedTask = taskRepository.save(task);
        log.info(
            "Created task userId={} taskId={} status={} goalId={}",
            userId,
            savedTask.getId(),
            savedTask.getStatus(),
            savedTask.getGoal() == null ? null : savedTask.getGoal().getId()
        );
        return toResponse(savedTask);
    }

    @Transactional
    public TaskResponse update(Long userId, Long taskId, TaskRequest request) {
        TaskItem task = getOwnedTask(userId, taskId);
        var previousStatus = task.getStatus();
        apply(userId, task, request);
        TaskItem savedTask = taskRepository.save(task);
        log.info(
            "Updated task userId={} taskId={} previousStatus={} nextStatus={} goalId={}",
            userId,
            savedTask.getId(),
            previousStatus,
            savedTask.getStatus(),
            savedTask.getGoal() == null ? null : savedTask.getGoal().getId()
        );
        return toResponse(savedTask);
    }

    @Transactional
    public void delete(Long userId, Long taskId) {
        getOwnedTask(userId, taskId);
        int detachedSessionCount = focusSessionRepository.clearTaskReferences(userId, taskId);
        taskRepository.deleteById(taskId);
        log.info("Deleted task userId={} taskId={} detachedSessionCount={}", userId, taskId, detachedSessionCount);
    }

    @Transactional(readOnly = true)
    public TaskItem getOwnedTask(Long userId, Long taskId) {
        TaskItem task = taskRepository.findById(taskId).orElseThrow(() -> new NotFoundException("Task not found"));
        if (!task.getUser().getId().equals(userId)) {
            throw new NotFoundException("Task not found");
        }
        return task;
    }

    @Transactional(readOnly = true)
    public TaskResponse toResponse(TaskItem task) {
        Goal goal = task.getGoal();
        return new TaskResponse(
            task.getId(),
            goal == null ? null : goal.getId(),
            goal == null ? null : goal.getTitle(),
            task.getTitle(),
            task.getDescription(),
            task.getStatus(),
            task.getEstimatedSessions(),
            task.getDueDate(),
            task.getCreatedAt()
        );
    }

    private void apply(Long userId, TaskItem task, TaskRequest request) {
        task.setTitle(request.title());
        task.setDescription(request.description());
        task.setStatus(request.status() == null ? task.getStatus() : request.status());
        task.setEstimatedSessions(request.estimatedSessions() == null ? task.getEstimatedSessions() : request.estimatedSessions());
        task.setDueDate(request.dueDate());
        task.setGoal(request.goalId() == null ? null : goalService.getOwnedGoal(userId, request.goalId()));
    }

    private AppUser getUser(Long userId) {
        return appUserRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
    }
}
