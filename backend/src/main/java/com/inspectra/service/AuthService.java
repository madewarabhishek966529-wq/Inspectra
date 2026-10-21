package com.inspectra.service;

import com.inspectra.model.User;
import com.inspectra.repository.UserRepository;
import com.inspectra.security.JwtUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    public record AuthResponse(String token, String userId, String email, String role) {}

    public AuthResponse register(String email, String password) {
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("User with email " + email + " already exists.");
        }

        String userId = "usr-" + UUID.randomUUID().toString().substring(0, 12);
        String hash = passwordEncoder.encode(password);
        User user = new User(userId, email, hash, "ROLE_USER");
        userRepository.save(user);

        String token = jwtUtils.generateToken(userId, email);
        return new AuthResponse(token, userId, email, user.getRole());
    }

    public AuthResponse login(String email, String password) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        String token = jwtUtils.generateToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getId(), user.getEmail(), user.getRole());
    }

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }
}
