package com.chronos.api.settings.model;

import com.chronos.api.common.model.BaseEntity;
import com.chronos.api.user.model.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_settings")
public class UserSettings extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", unique = true)
    private AppUser user;

    @Column(nullable = false)
    private Integer focusMinutes = 25;

    @Column(nullable = false)
    private Integer shortBreakMinutes = 5;

    @Column(nullable = false)
    private Integer longBreakMinutes = 15;

    @Column(nullable = false)
    private Boolean desktopNotifications = true;

    @Column(nullable = false)
    private String theme = "obsidian-sanctuary";

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public Integer getFocusMinutes() {
        return focusMinutes;
    }

    public void setFocusMinutes(Integer focusMinutes) {
        this.focusMinutes = focusMinutes;
    }

    public Integer getShortBreakMinutes() {
        return shortBreakMinutes;
    }

    public void setShortBreakMinutes(Integer shortBreakMinutes) {
        this.shortBreakMinutes = shortBreakMinutes;
    }

    public Integer getLongBreakMinutes() {
        return longBreakMinutes;
    }

    public void setLongBreakMinutes(Integer longBreakMinutes) {
        this.longBreakMinutes = longBreakMinutes;
    }

    public Boolean getDesktopNotifications() {
        return desktopNotifications;
    }

    public void setDesktopNotifications(Boolean desktopNotifications) {
        this.desktopNotifications = desktopNotifications;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }
}
