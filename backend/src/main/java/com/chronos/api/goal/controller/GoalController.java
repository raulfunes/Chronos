package com.chronos.api.goal.controller;

import com.chronos.api.common.security.CurrentUser;
import com.chronos.api.goal.dto.GoalRequest;
import com.chronos.api.goal.dto.GoalResponse;
import com.chronos.api.goal.service.GoalService;
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
@RequestMapping("/api/v1/goals")
public class GoalController {

    private final GoalService goalService;
    private final CurrentUser currentUser;

    public GoalController(GoalService goalService, CurrentUser currentUser) {
        this.goalService = goalService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<GoalResponse> findAll() {
        return goalService.findAll(currentUser.require().getUserId());
    }

    @PostMapping
    public GoalResponse create(@Valid @RequestBody GoalRequest request) {
        return goalService.create(currentUser.require().getUserId(), request);
    }

    @PatchMapping("/{goalId}")
    public GoalResponse update(@PathVariable Long goalId, @Valid @RequestBody GoalRequest request) {
        return goalService.update(currentUser.require().getUserId(), goalId, request);
    }

    @DeleteMapping("/{goalId}")
    public void delete(@PathVariable Long goalId) {
        goalService.delete(currentUser.require().getUserId(), goalId);
    }
}
