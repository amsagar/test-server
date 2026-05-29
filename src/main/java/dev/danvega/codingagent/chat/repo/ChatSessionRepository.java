package dev.danvega.codingagent.chat.repo;

import dev.danvega.codingagent.applicationconfig.configuration.utils.SqlQueryLoader;
import dev.danvega.codingagent.chat.entity.ChatSession;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Optional;

@Repository
public class ChatSessionRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SqlQueryLoader sqlQueryLoader;

    public ChatSessionRepository(JdbcTemplate jdbcTemplate, SqlQueryLoader sqlQueryLoader) {
        this.jdbcTemplate = jdbcTemplate;
        this.sqlQueryLoader = sqlQueryLoader;
    }

    public String create(String title, String assistantId, long now) {
        String sql = sqlQueryLoader.getQuery("CHAT.SESSION.CREATE");
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[] { "id" });
            ps.setString(1, title);
            ps.setString(2, assistantId);
            ps.setLong(3, now);
            ps.setLong(4, now);
            return ps;
        }, keyHolder);
        Object id = keyHolder.getKeys().get("id");
        return String.valueOf(id);
    }

    public List<ChatSession> findByArchived(boolean archived) {
        String sql = sqlQueryLoader.getQuery("CHAT.SESSION.FIND_BY_ARCHIVED");
        return jdbcTemplate.query(sql, sessionRowMapper(), archived);
    }

    public Optional<ChatSession> findById(String id) {
        String sql = sqlQueryLoader.getQuery("CHAT.SESSION.FIND_BY_ID");
        return jdbcTemplate.query(sql, sessionRowMapper(), id).stream().findFirst();
    }

    public int updateTitle(String id, String title, long now) {
        String sql = sqlQueryLoader.getQuery("CHAT.SESSION.UPDATE_TITLE");
        return jdbcTemplate.update(sql, title, now, id);
    }

    public int updateArchived(String id, boolean archived, long now) {
        String sql = sqlQueryLoader.getQuery("CHAT.SESSION.UPDATE_ARCHIVED");
        return jdbcTemplate.update(sql, archived, now, id);
    }

    public int touch(String id, long now) {
        String sql = sqlQueryLoader.getQuery("CHAT.SESSION.TOUCH");
        return jdbcTemplate.update(sql, now, id);
    }

    public int delete(String id) {
        String sql = sqlQueryLoader.getQuery("CHAT.SESSION.DELETE");
        return jdbcTemplate.update(sql, id);
    }

    private RowMapper<ChatSession> sessionRowMapper() {
        return (rs, rowNum) -> new ChatSession(
                rs.getString("id"),
                rs.getString("title"),
                rs.getBoolean("archived"),
                rs.getString("assistant_id"),
                rs.getLong("created_at"),
                rs.getLong("updated_at")
        );
    }
}
