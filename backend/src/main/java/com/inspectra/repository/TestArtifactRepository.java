package com.inspectra.repository;

import com.inspectra.model.TestArtifact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestArtifactRepository extends JpaRepository<TestArtifact, String> {
    List<TestArtifact> findByTestRunId(String testRunId);
    List<TestArtifact> findByFindingId(String findingId);
}
