package com.chronos.api.settings.dto;

import com.chronos.api.settings.model.AmbientSound;
import com.chronos.api.settings.model.AudioScope;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Max;

public record UserSettingsRequest(
    @Min(1) Integer focusMinutes,
    @Min(1) Integer shortBreakMinutes,
    @Min(1) Integer longBreakMinutes,
    Boolean desktopNotifications,
    Boolean soundEnabled,
    String theme,
    AmbientSound ambientSound,
    @Min(0) @Max(100) Integer ambientVolume,
    AudioScope audioScope
) {
}
