package com.chronos.api.settings.service;

import com.chronos.api.common.exception.NotFoundException;
import com.chronos.api.settings.dto.UserSettingsRequest;
import com.chronos.api.settings.dto.UserSettingsResponse;
import com.chronos.api.settings.model.UserSettings;
import com.chronos.api.settings.repository.UserSettingsRepository;
import com.chronos.api.user.model.AppUser;
import com.chronos.api.user.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserSettingsService {

    private static final Logger log = LoggerFactory.getLogger(UserSettingsService.class);

    private final UserSettingsRepository userSettingsRepository;
    private final AppUserRepository appUserRepository;

    public UserSettingsService(UserSettingsRepository userSettingsRepository, AppUserRepository appUserRepository) {
        this.userSettingsRepository = userSettingsRepository;
        this.appUserRepository = appUserRepository;
    }

    public UserSettingsResponse get(Long userId) {
        return toResponse(getSettingsEntity(userId));
    }

    @Transactional
    public UserSettingsResponse update(Long userId, UserSettingsRequest request) {
        UserSettings settings = getSettingsEntity(userId);
        if (request.focusMinutes() != null) {
            settings.setFocusMinutes(request.focusMinutes());
        }
        if (request.shortBreakMinutes() != null) {
            settings.setShortBreakMinutes(request.shortBreakMinutes());
        }
        if (request.longBreakMinutes() != null) {
            settings.setLongBreakMinutes(request.longBreakMinutes());
        }
        if (request.desktopNotifications() != null) {
            settings.setDesktopNotifications(request.desktopNotifications());
        }
        if (request.theme() != null) {
            settings.setTheme(request.theme());
        }
        UserSettings savedSettings = userSettingsRepository.save(settings);
        log.info(
            "Updated settings userId={} focusMinutes={} shortBreakMinutes={} longBreakMinutes={} desktopNotifications={} theme={}",
            userId,
            savedSettings.getFocusMinutes(),
            savedSettings.getShortBreakMinutes(),
            savedSettings.getLongBreakMinutes(),
            savedSettings.getDesktopNotifications(),
            savedSettings.getTheme()
        );
        return toResponse(savedSettings);
    }

    private UserSettings getSettingsEntity(Long userId) {
        return userSettingsRepository.findByUserId(userId).orElseGet(() -> {
            AppUser user = appUserRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
            UserSettings settings = new UserSettings();
            settings.setUser(user);
            return userSettingsRepository.save(settings);
        });
    }

    private UserSettingsResponse toResponse(UserSettings settings) {
        return new UserSettingsResponse(
            settings.getId(),
            settings.getFocusMinutes(),
            settings.getShortBreakMinutes(),
            settings.getLongBreakMinutes(),
            settings.getDesktopNotifications(),
            settings.getTheme()
        );
    }
}
