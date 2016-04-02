CREATE OR REPLACE FUNCTION Update_DateModified_Column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.DateModified = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- eventTypes table

DROP TABLE IF EXISTS eventTypes CASCADE;
DROP TRIGGER IF EXISTS eventTypes_UpdateDateModified ON eventTypes;

CREATE TABLE eventTypes (
  EventTypeID serial NOT NULL,
  EventTypeName varchar(128) NOT NULL,
  DateCreated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DateModified timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (EventTypeID)
);

CREATE TRIGGER eventTypes_UpdateDateModified BEFORE UPDATE ON eventTypes FOR ROW EXECUTE PROCEDURE Update_DateModified_Column();

-- events table

DROP TABLE IF EXISTS events CASCADE;
DROP TRIGGER IF EXISTS events_UpdateDateModified ON events;

CREATE TABLE events (
  EventID serial NOT NULL,
  EventName varchar(128) NOT NULL,
  EventTypeID integer DEFAULT NULL,
  DateStart timestamp DEFAULT NULL,
  DateEnd timestamp DEFAULT NULL,
  DateCreated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DateModified timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (EventID),
  CONSTRAINT "fk-events-eventTypes-1" FOREIGN KEY (EventTypeID) REFERENCES eventTypes (EventTypeID)
);

CREATE TRIGGER events_UpdateDateModified BEFORE UPDATE ON events FOR ROW EXECUTE PROCEDURE Update_DateModified_Column();

-- notificationTimes table

DROP TABLE IF EXISTS notificationTimes CASCADE;
DROP TRIGGER IF EXISTS notificationTimes_UpdateDateModified ON notificationTimes;

CREATE TABLE notificationTimes (
  NotificationTimeID serial NOT NULL,
  Label varchar(128) NOT NULL,
  DurationInSeconds integer NOT NULL,
  DateCreated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DateModified timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (NotificationTimeID)
);

CREATE TRIGGER notificationTimes_UpdateDateModified BEFORE UPDATE ON notificationTimes FOR ROW EXECUTE PROCEDURE Update_DateModified_Column();

-- users table

DROP TABLE IF EXISTS users CASCADE;
DROP TRIGGER IF EXISTS users_UpdateDateModified ON users;

CREATE TABLE users (
  UserID serial NOT NULL,
  FirstName varchar(128) NOT NULL DEFAULT '',
  LastName varchar(128) NOT NULL DEFAULT '',
  Email varchar(254) NOT NULL UNIQUE,
  Password text,
  IsConfirmed boolean NOT NULL DEFAULT FALSE,
  DateCreated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DateModified timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (UserID)
);

CREATE TRIGGER users_UpdateDateModified BEFORE UPDATE ON users FOR ROW EXECUTE PROCEDURE Update_DateModified_Column();

-- usersEvents table

DROP TABLE IF EXISTS usersEvents CASCADE;
DROP TRIGGER IF EXISTS usersEvents_UpdateDateModified ON usersEvents;

CREATE TABLE usersEvents (
  UserEventID serial NOT NULL,
  UserID integer NOT NULL,
  EventID integer NOT NULL,
  DateCreated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DateModified timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (UserEventID),
  CONSTRAINT "fk-usersEvents-events-1" FOREIGN KEY (EventID) REFERENCES events (EventID)
);

CREATE TRIGGER usersEvents_UpdateDateModified BEFORE UPDATE ON usersEvents FOR ROW EXECUTE PROCEDURE Update_DateModified_Column();

-- usersNotificationTimes table

DROP TABLE IF EXISTS usersNotificationTimes CASCADE;
DROP TRIGGER IF EXISTS usersNotificationTimes_UpdateDateModified ON usersNotificationTimes;

CREATE TABLE usersNotificationTimes (
  UserNotificationTimeID serial NOT NULL,
  UserID integer NOT NULL,
  NotificationTimeID integer NOT NULL,
  DateCreated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  DateModified timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (UserNotificationTimeID),
  CONSTRAINT "fk-usersNotificationTimes-notificationTimes-1" FOREIGN KEY (NotificationTimeID) REFERENCES NotificationTimes (NotificationTimeID)
);

CREATE TRIGGER usersNotificationTimes_UpdateDateModified BEFORE UPDATE ON usersNotificationTimes FOR ROW EXECUTE PROCEDURE Update_DateModified_Column();
