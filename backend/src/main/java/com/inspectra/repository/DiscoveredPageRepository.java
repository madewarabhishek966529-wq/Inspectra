package com.inspectra.repository;

import com.inspectra.model.DiscoveredPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiscoveredPageRepository extends JpaRepository<DiscoveredPage, String> {
    List<DiscoveredPage> findByTestRunId(String testRunId);
}
