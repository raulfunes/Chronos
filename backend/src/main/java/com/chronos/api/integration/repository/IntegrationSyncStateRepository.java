package com.chronos.api.integration.repository;

import com.chronos.api.integration.model.IntegrationSyncState;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IntegrationSyncStateRepository extends JpaRepository<IntegrationSyncState, Long> {

    Optional<IntegrationSyncState> findByIntegrationAccountIdAndResourceType(Long integrationAccountId, String resourceType);

    void deleteAllByIntegrationAccountId(Long integrationAccountId);
}
