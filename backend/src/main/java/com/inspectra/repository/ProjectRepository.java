package com.inspectra.repository;

import com.inspectra.model.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, String> {
    List<Project> findByOwnerIdOrderByCreatedAtDesc(String ownerId);
    Optional<Project> findByIdAndOwnerId(String id, String ownerId);
    List<Project> findByScheduleEnabledTrue();
    List<Project> findByScheduleEnabledTrueAndNextRunAtLessThanEqual(Instant now);
}

