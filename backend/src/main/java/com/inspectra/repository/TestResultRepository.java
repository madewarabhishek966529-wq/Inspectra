package com.inspectra.repository;

import com.inspectra.model.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestResultRepository extends JpaRepository<TestResult, String> {
    List<TestResult> findByTestRunId(String testRunId);
    List<TestResult> findByTestRunIdAndStatus(String testRunId, String status);
}
