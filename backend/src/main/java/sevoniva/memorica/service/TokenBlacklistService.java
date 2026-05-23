package sevoniva.memorica.service;

import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@Profile("!test")
public class TokenBlacklistService {

    private final RedisTemplate<String, String> redisTemplate;

    public TokenBlacklistService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void blacklist(String token, long expirationMs) {
        long ttl = expirationMs - System.currentTimeMillis();
        if (ttl > 0) {
            redisTemplate.opsForValue().set("blacklist:" + token, "1", Duration.ofMillis(ttl));
        }
    }

    public boolean isBlacklisted(String token) {
        return Boolean.TRUE.equals(redisTemplate.hasKey("blacklist:" + token));
    }
}
