package com.chronos.api.task.controller;

import com.chronos.api.common.security.CurrentUser;
import com.chronos.api.task.dto.TaskRequest;
import com.chronos.api.task.dto.TaskResponse;
import com.chronos.api.task.service.TaskService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {

    private final TaskService taskService;
    private final CurrentUser currentUser;

    public TaskController(TaskService taskService, CurrentUser currentUser) {
        this.taskService = taskService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<TaskResponse> findAll() {
        return taskService.findAll(currentUser.require().getUserId());
    }

    @PostMapping
    public TaskResponse create(@Valid @RequestBody TaskRequest request) {
        return taskService.create(currentUser.require().getUserId(), request);
    }

    @PatchMapping("/{taskId}")
    public TaskResponse update(@PathVariable Long taskId, @Valid @RequestBody TaskRequest request) {
        return taskService.update(currentUser.require().getUserId(), taskId, request);
    }

    @DeleteMapping("/{taskId}")
    public void delete(@PathVariable Long taskId) {
        taskService.delete(currentUser.require().getUserId(), taskId);
    }
}
