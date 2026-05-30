package dev.danvega.codingagent.style.repo;

import dev.danvega.codingagent.applicationconfig.configuration.utils.SqlQueryLoader;
import dev.danvega.codingagent.style.entity.ResponseStyle;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.util.List;
import java.util.Optional;

@Repository
public class ResponseStyleRepository {

    private final JdbcTemplate jdbcTemplate;
    private final SqlQueryLoader sqlQueryLoader;

    public ResponseStyleRepository(JdbcTemplate jdbcTemplate, SqlQueryLoader sqlQueryLoader) {
        this.jdbcTemplate = jdbcTemplate;
        this.sqlQueryLoader = sqlQueryLoader;
    }

    public String create(ResponseStyle s, long now) {
        String sql = sqlQueryLoader.getQuery("STYLE.CREATE");
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[] { "id" });
            ps.setString(1, s.getName());
            ps.setString(2, s.getDescription());
            ps.setString(3, s.getInstructions());
            ps.setLong(4, now);
            ps.setLong(5, now);
            return ps;
        }, keyHolder);
        return String.valueOf(keyHolder.getKeys().get("id"));
    }

    public List<ResponseStyle> findAll() {
        return jdbcTemplate.query(sqlQueryLoader.getQuery("STYLE.FIND_ALL"), rowMapper());
    }

    public Optional<ResponseStyle> findById(String id) {
        return jdbcTemplate.query(sqlQueryLoader.getQuery("STYLE.FIND_BY_ID"), rowMapper(), id)
                .stream().findFirst();
    }

    public int update(ResponseStyle s, long now) {
        return jdbcTemplate.update(sqlQueryLoader.getQuery("STYLE.UPDATE"),
                s.getName(), s.getDescription(), s.getInstructions(), now, s.getId());
    }

    public int delete(String id) {
        return jdbcTemplate.update(sqlQueryLoader.getQuery("STYLE.DELETE"), id);
    }

    public long count() {
        Long count = jdbcTemplate.queryForObject(sqlQueryLoader.getQuery("STYLE.COUNT"), Long.class);
        return count == null ? 0 : count;
    }

    private RowMapper<ResponseStyle> rowMapper() {
        return (rs, rowNum) -> new ResponseStyle(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("description"),
                rs.getString("instructions"),
                rs.getLong("created_at"),
                rs.getLong("updated_at")
        );
    }
}
