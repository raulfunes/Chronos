package com.chronos.api.settings.dto;

public record UserSettingsResponse(
    Long id,
    Integer focusMinutes,
    Integer shortBreakMinutes,
    Integer longBreakMinutes,
    Boolean desktopNotifications,
    String theme
) {
}
