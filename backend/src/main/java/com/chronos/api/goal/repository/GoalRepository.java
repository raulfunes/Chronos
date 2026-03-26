package com.chronos.api.goal.repository;

import com.chronos.api.goal.model.Goal;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GoalRepository extends JpaRepository<Goal, Long> {
    List<Goal> findAllByUserIdOrderByCreatedAtDesc(Long userId);
    long countByUserId(Long userId);
}
