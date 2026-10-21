package com.inspectra.repository;

import com.inspectra.model.ExecutionEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExecutionEventRepository extends JpaRepository<ExecutionEvent, String> {
    List<ExecutionEvent> findByTestRunIdOrderBySequenceNumberAsc(String testRunId);
    int countByTestRunId(String testRunId);
}
