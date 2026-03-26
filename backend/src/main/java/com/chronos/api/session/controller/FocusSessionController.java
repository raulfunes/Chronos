package com.chronos.api.session.controller;

import com.chronos.api.common.security.CurrentUser;
import com.chronos.api.session.dto.FocusSessionRequest;
import com.chronos.api.session.dto.FocusSessionResponse;
import com.chronos.api.session.service.FocusSessionService;
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
@RequestMapping("/api/v1/sessions")
public class FocusSessionController {

    private final FocusSessionService focusSessionService;
    private final CurrentUser currentUser;

    public FocusSessionController(FocusSessionService focusSessionService, CurrentUser currentUser) {
        this.focusSessionService = focusSessionService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<FocusSessionResponse> findAll() {
        return focusSessionService.findAll(currentUser.require().getUserId());
    }

    @PostMapping
    public FocusSessionResponse create(@Valid @RequestBody FocusSessionRequest request) {
        return focusSessionService.create(currentUser.require().getUserId(), request);
    }

    @PatchMapping("/{sessionId}")
    public FocusSessionResponse update(@PathVariable Long sessionId, @Valid @RequestBody FocusSessionRequest request) {
        return focusSessionService.update(currentUser.require().getUserId(), sessionId, request);
    }

    @PostMapping("/{sessionId}/complete")
    public FocusSessionResponse complete(@PathVariable Long sessionId) {
        return focusSessionService.complete(currentUser.require().getUserId(), sessionId);
    }

    @DeleteMapping("/{sessionId}")
    public void delete(@PathVariable Long sessionId) {
        focusSessionService.delete(currentUser.require().getUserId(), sessionId);
    }
}
