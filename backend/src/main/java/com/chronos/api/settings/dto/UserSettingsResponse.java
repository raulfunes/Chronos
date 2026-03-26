package com.chronos.api.settings.dto;

import com.chronos.api.settings.model.AmbientSound;
import com.chronos.api.settings.model.AudioScope;

public record UserSettingsResponse(
    Long id,
    Integer focusMinutes,
    Integer shortBreakMinutes,
    Integer longBreakMinutes,
    Boolean desktopNotifications,
    Boolean soundEnabled,
    String theme,
    AmbientSound ambientSound,
    Integer ambientVolume,
    AudioScope audioScope
) {
}
