package com.chronos.api.goal.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.chronos.api.auth.dto.RegisterRequest;
import com.chronos.api.auth.service.AuthService;
import com.chronos.api.goal.dto.GoalRequest;
import com.chronos.api.goal.dto.GoalResponse;
import com.chronos.api.goal.model.GoalPriority;
import com.chronos.api.goal.model.GoalStatus;
import com.chronos.api.goal.repository.GoalRepository;
import com.chronos.api.session.dto.FocusSessionRequest;
import com.chronos.api.session.dto.FocusSessionResponse;
import com.chronos.api.session.model.FocusSession;
import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.model.SessionType;
import com.chronos.api.session.repository.FocusSessionRepository;
import com.chronos.api.session.service.FocusSessionService;
import com.chronos.api.task.dto.TaskRequest;
import com.chronos.api.task.dto.TaskResponse;
import com.chronos.api.task.model.TaskItem;
import com.chronos.api.task.model.TaskStatus;
import com.chronos.api.task.repository.TaskRepository;
import com.chronos.api.task.service.TaskService;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class GoalServiceTest {

    @Autowired
    private GoalService goalService;

    @Autowired
    private TaskService taskService;

    @Autowired
    private FocusSessionService focusSessionService;

    @Autowired
    private GoalRepository goalRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private FocusSessionRepository focusSessionRepository;

    @Autowired
    private AuthService authService;

    @Test
    void deleteDetachesTasksAndSessionsBeforeRemovingGoal() {
        Long userId = createUser("goal-delete-links@example.com");
        GoalResponse goal = goalService.create(
            userId,
            new GoalRequest(
                "Ship delete handling",
                "Preserve linked history",
                GoalStatus.IN_PROGRESS,
                GoalPriority.HIGH,
                LocalDate.now().plusDays(7)
            )
        );
        TaskResponse task = taskService.create(
            userId,
            new TaskRequest(
                goal.id(),
                "Verify linked cleanup",
                "Task should survive the goal deletion",
                TaskStatus.TODO,
                2,
                LocalDate.now().plusDays(2)
            )
        );
        FocusSessionResponse session = focusSessionService.create(
            userId,
            new FocusSessionRequest(goal.id(), task.id(), SessionType.POMODORO, SessionStatus.SCHEDULED, 25, Instant.now())
        );

        goalService.delete(userId, goal.id());

        assertThat(goalRepository.findById(goal.id())).isEmpty();

        TaskItem persistedTask = taskRepository.findById(task.id()).orElseThrow();
        FocusSession persistedSession = focusSessionRepository.findById(session.id()).orElseThrow();

        assertThat(persistedTask.getGoal()).isNull();
        assertThat(persistedSession.getGoal()).isNull();
        assertThat(persistedSession.getTask()).isNotNull();
        assertThat(persistedSession.getTask().getId()).isEqualTo(task.id());
    }

    private Long createUser(String email) {
        return authService.register(new RegisterRequest("Chronos Tester", email, "password123")).userId();
    }
}
