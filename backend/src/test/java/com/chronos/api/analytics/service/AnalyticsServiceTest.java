package com.chronos.api.analytics.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.chronos.api.analytics.dto.AnalyticsSummaryResponse;
import com.chronos.api.auth.dto.RegisterRequest;
import com.chronos.api.auth.service.AuthService;
import com.chronos.api.session.dto.FocusSessionRequest;
import com.chronos.api.session.model.SessionStatus;
import com.chronos.api.session.model.SessionType;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AnalyticsServiceTest {

    @Autowired
    private AnalyticsService analyticsService;

    @Autowired
    private AuthService authService;

    @Autowired
    private com.chronos.api.session.service.FocusSessionService focusSessionService;

    @Test
    void summaryCountsSkippedPomodoroMinutesWithoutTreatingThemAsCompletedSessions() {
        Long userId = authService.register(new RegisterRequest("Analytics Tester", "analytics@example.com", "password123")).userId();

        focusSessionService.create(userId, request(SessionType.POMODORO, SessionStatus.COMPLETED, 25));
        focusSessionService.create(userId, request(SessionType.POMODORO, SessionStatus.SKIPPED, 8));

        AnalyticsSummaryResponse summary = analyticsService.summary(userId);

        assertThat(summary.focusMinutes()).isEqualTo(33);
        assertThat(summary.completedSessions()).isEqualTo(1);
        assertThat(summary.currentStreak()).isEqualTo(1);
    }

    @Test
    void skippedPomodoroDoesNotStartStreakByItself() {
        Long userId = authService.register(new RegisterRequest("Skipped Only", "analytics-skipped@example.com", "password123")).userId();

        focusSessionService.create(userId, request(SessionType.POMODORO, SessionStatus.SKIPPED, 6));

        AnalyticsSummaryResponse summary = analyticsService.summary(userId);

        assertThat(summary.focusMinutes()).isEqualTo(6);
        assertThat(summary.completedSessions()).isZero();
        assertThat(summary.currentStreak()).isZero();
    }

    private FocusSessionRequest request(SessionType type, SessionStatus status, int durationMinutes) {
        return new FocusSessionRequest(null, null, type, status, durationMinutes, Instant.now());
    }
}
