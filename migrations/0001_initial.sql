PRAGMA foreign_keys = ON;

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  markdown TEXT NOT NULL DEFAULT '',
  rendered_html TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  reading_minutes INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX posts_status_published_at_idx
  ON posts(status, published_at DESC);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

CREATE INDEX post_tags_tag_id_idx ON post_tags(tag_id, post_id);

CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  site_title TEXT NOT NULL DEFAULT 'MISAKA.LOG',
  site_description TEXT NOT NULL DEFAULT '记录代码、生活，以及偶尔出现的二次元观察。',
  avatar_url TEXT NOT NULL DEFAULT '',
  profile_handle TEXT NOT NULL DEFAULT '',
  profile_markdown TEXT NOT NULL DEFAULT '',
  profile_rendered_html TEXT NOT NULL DEFAULT '',
  background_url TEXT NOT NULL DEFAULT '',
  background_position_x INTEGER NOT NULL DEFAULT 50 CHECK (background_position_x BETWEEN 0 AND 100),
  background_position_y INTEGER NOT NULL DEFAULT 50 CHECK (background_position_y BETWEEN 0 AND 100),
  mobile_background_position_x INTEGER NOT NULL DEFAULT 50 CHECK (mobile_background_position_x BETWEEN 0 AND 100),
  mobile_background_position_y INTEGER NOT NULL DEFAULT 30 CHECK (mobile_background_position_y BETWEEN 0 AND 100),
  background_overlay INTEGER NOT NULL DEFAULT 48 CHECK (background_overlay BETWEEN 0 AND 90),
  github_url TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  theme_mode TEXT NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('system', 'light', 'dark')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO site_settings (id) VALUES (1);

CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  github_user_id TEXT NOT NULL,
  github_login TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX admin_sessions_expires_at_idx ON admin_sessions(expires_at);

CREATE TABLE slug_redirects (
  old_slug TEXT PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE posts_fts USING fts5(
  title,
  summary,
  markdown,
  content='posts',
  content_rowid='id',
  tokenize='unicode61'
);

CREATE TRIGGER posts_fts_insert AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, title, summary, markdown)
  VALUES (new.id, new.title, new.summary, new.markdown);
END;

CREATE TRIGGER posts_fts_delete AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, summary, markdown)
  VALUES ('delete', old.id, old.title, old.summary, old.markdown);
END;

CREATE TRIGGER posts_fts_update AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, title, summary, markdown)
  VALUES ('delete', old.id, old.title, old.summary, old.markdown);
  INSERT INTO posts_fts(rowid, title, summary, markdown)
  VALUES (new.id, new.title, new.summary, new.markdown);
END;
