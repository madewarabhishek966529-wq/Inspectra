package com.inspectra.repository;

import com.inspectra.model.TestRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TestRunRepository extends JpaRepository<TestRun, String> {
    List<TestRun> findByProjectIdOrderByCreatedAtDesc(String projectId);
    List<TestRun> findByRequestedByOrderByCreatedAtDesc(String requestedBy);
    Optional<TestRun> findByIdAndRequestedBy(String id, String requestedBy);
}
