package com.inspectra.repository;

import com.inspectra.model.Finding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FindingRepository extends JpaRepository<Finding, String> {
    List<Finding> findByTestRunId(String testRunId);
    List<Finding> findByTestRunIdAndSeverity(String testRunId, String severity);
    List<Finding> findByTestRunIdAndCategory(String testRunId, String category);
}
