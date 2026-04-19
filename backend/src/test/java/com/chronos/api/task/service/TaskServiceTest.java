package com.chronos.api.task.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.chronos.api.auth.dto.RegisterRequest;
import com.chronos.api.auth.service.AuthService;
import com.chronos.api.session.dto.FocusSessionRequest;
import com.chronos.api.session.dto.FocusSessionResponse;
import com.chronos.api.session.model.FocusSession;
import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.model.SessionType;
import com.chronos.api.session.repository.FocusSessionRepository;
import com.chronos.api.session.service.FocusSessionService;
import com.chronos.api.task.dto.TaskRequest;
import com.chronos.api.task.dto.TaskResponse;
import com.chronos.api.task.model.TaskStatus;
import com.chronos.api.task.repository.TaskRepository;
import java.time.Instant;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class TaskServiceTest {

    @Autowired
    private TaskService taskService;

    @Autowired
    private FocusSessionService focusSessionService;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private FocusSessionRepository focusSessionRepository;

    @Autowired
    private AuthService authService;

    @Test
    void deleteDetachesSessionsBeforeRemovingTask() {
        Long userId = createUser("task-delete-links@example.com");
        TaskResponse task = taskService.create(
            userId,
            new TaskRequest(
                null,
                "Keep session history",
                "Task delete should not remove existing sessions",
                TaskStatus.TODO,
                1,
                LocalDate.now().plusDays(1)
            )
        );
        FocusSessionResponse session = focusSessionService.create(
            userId,
            new FocusSessionRequest(null, task.id(), SessionType.POMODORO, SessionStatus.SCHEDULED, 25, Instant.now())
        );

        taskService.delete(userId, task.id());

        assertThat(taskRepository.findById(task.id())).isEmpty();

        FocusSession persistedSession = focusSessionRepository.findById(session.id()).orElseThrow();

        assertThat(persistedSession.getTask()).isNull();
        assertThat(persistedSession.getGoal()).isNull();
    }

    private Long createUser(String email) {
        return authService.register(new RegisterRequest("Chronos Tester", email, "password123")).userId();
    }
}
