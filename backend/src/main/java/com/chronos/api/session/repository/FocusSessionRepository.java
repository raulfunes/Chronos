package com.chronos.api.session.repository;

import com.chronos.api.session.model.FocusSession;
import com.chronos.api.session.model.SessionStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FocusSessionRepository extends JpaRepository<FocusSession, Long> {
    List<FocusSession> findAllByUserIdOrderByScheduledForAscCreatedAtAsc(Long userId);
    List<FocusSession> findAllByUserIdAndScheduledForBetweenOrderByScheduledForAsc(Long userId, Instant start, Instant end);
    List<FocusSession> findAllByUserIdAndStatus(Long userId, SessionStatus status);
    long countByUserIdAndStatus(Long userId, SessionStatus status);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
        update FocusSession session
        set session.goal = null
        where session.user.id = :userId and session.goal is not null and session.goal.id = :goalId
        """)
    int clearGoalReferences(@Param("userId") Long userId, @Param("goalId") Long goalId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("""
        update FocusSession session
        set session.task = null
        where session.user.id = :userId and session.task is not null and session.task.id = :taskId
        """)
    int clearTaskReferences(@Param("userId") Long userId, @Param("taskId") Long taskId);
}
