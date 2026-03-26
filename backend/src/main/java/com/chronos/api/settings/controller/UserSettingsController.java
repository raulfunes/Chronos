package com.chronos.api.settings.controller;

import com.chronos.api.common.security.CurrentUser;
import com.chronos.api.settings.dto.UserSettingsRequest;
import com.chronos.api.settings.dto.UserSettingsResponse;
import com.chronos.api.settings.service.UserSettingsService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/settings")
public class UserSettingsController {

    private final UserSettingsService userSettingsService;
    private final CurrentUser currentUser;

    public UserSettingsController(UserSettingsService userSettingsService, CurrentUser currentUser) {
        this.userSettingsService = userSettingsService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public UserSettingsResponse get() {
        return userSettingsService.get(currentUser.require().getUserId());
    }

    @PatchMapping
    public UserSettingsResponse update(@Valid @RequestBody UserSettingsRequest request) {
        return userSettingsService.update(currentUser.require().getUserId(), request);
    }
}
