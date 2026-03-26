package com.chronos.api.integration.repository;

import com.chronos.api.integration.model.IntegrationLink;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IntegrationLinkRepository extends JpaRepository<IntegrationLink, Long> {

    List<IntegrationLink> findAllByIntegrationAccountIdAndUserIdOrderByCreatedAtDesc(Long integrationAccountId, Long userId);

    Optional<IntegrationLink> findByIdAndIntegrationAccountIdAndUserId(Long id, Long integrationAccountId, Long userId);

    void deleteAllByIntegrationAccountId(Long integrationAccountId);
}
