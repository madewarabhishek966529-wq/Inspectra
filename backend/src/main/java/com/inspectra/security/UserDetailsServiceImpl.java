package com.inspectra.security;

import com.inspectra.model.User;
import com.inspectra.repository.UserRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String idOrEmail) throws UsernameNotFoundException {
        User user = userRepository.findById(idOrEmail)
                .or(() -> userRepository.findByEmail(idOrEmail))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + idOrEmail));

        return new org.springframework.security.core.userdetails.User(
                user.getId(),
                user.getPasswordHash(),
                Collections.singletonList(new SimpleGrantedAuthority(user.getRole()))
        );
    }
}
