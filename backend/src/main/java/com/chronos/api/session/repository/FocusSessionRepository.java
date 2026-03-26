package com.chronos.api.session.repository;

import com.chronos.api.session.model.FocusSession;
import com.chronos.api.session.model.SessionStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FocusSessionRepository extends JpaRepository<FocusSession, Long> {
    List<FocusSession> findAllByUserIdOrderByScheduledForAscCreatedAtAsc(Long userId);
    List<FocusSession> findAllByUserIdAndScheduledForBetweenOrderByScheduledForAsc(Long userId, Instant start, Instant end);
    List<FocusSession> findAllByUserIdAndStatus(Long userId, SessionStatus status);
    long countByUserIdAndStatus(Long userId, SessionStatus status);
}
