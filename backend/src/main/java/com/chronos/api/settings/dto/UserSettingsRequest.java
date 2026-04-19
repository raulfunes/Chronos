package com.chronos.api.settings.dto;

import jakarta.validation.constraints.Min;

public record UserSettingsRequest(
    @Min(1) Integer focusMinutes,
    @Min(1) Integer shortBreakMinutes,
    @Min(1) Integer longBreakMinutes,
    Boolean desktopNotifications,
    String theme
) {
}
