package dev.danvega.codingagent.chat.repo;

import dev.danvega.codingagent.applicationconfig.configuration.utils.SqlQueryLoader;
import dev.danvega.codingagent.chat.entity.ChatToolEvent;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ChatToolEventRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SqlQueryLoader sqlQueryLoader;

    public ChatToolEventRepository(JdbcTemplate jdbcTemplate, SqlQueryLoader sqlQueryLoader) {
        this.jdbcTemplate = jdbcTemplate;
        this.sqlQueryLoader = sqlQueryLoader;
    }

    public void save(String sessionId, int turnIndex, int seq, String callId, String name,
                     String input, String output, boolean error, long now) {
        String sql = sqlQueryLoader.getQuery("CHAT.TOOL_EVENT.CREATE");
        jdbcTemplate.update(sql, sessionId, turnIndex, seq, callId, name, input, output, error, now);
    }

    public List<ChatToolEvent> findBySession(String sessionId) {
        String sql = sqlQueryLoader.getQuery("CHAT.TOOL_EVENT.FIND_BY_SESSION");
        return jdbcTemplate.query(sql, toolEventRowMapper(), sessionId);
    }

    /** Removes all tool events at or after the given assistant turn (used when truncating a session). */
    public int deleteFromTurn(String sessionId, int fromTurnInclusive) {
        String sql = sqlQueryLoader.getQuery("CHAT.TOOL_EVENT.DELETE_FROM_TURN");
        return jdbcTemplate.update(sql, sessionId, fromTurnInclusive);
    }

    private RowMapper<ChatToolEvent> toolEventRowMapper() {
        return (rs, rowNum) -> new ChatToolEvent(
                rs.getString("id"),
                rs.getString("session_id"),
                rs.getInt("turn_index"),
                rs.getInt("seq"),
                rs.getString("call_id"),
                rs.getString("tool_name"),
                rs.getString("tool_input"),
                rs.getString("tool_output"),
                rs.getBoolean("is_error"),
                rs.getLong("created_at")
        );
    }
}
