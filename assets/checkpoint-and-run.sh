#!/bin/sh
# CRaC (Coordinated Restore at Checkpoint) entrypoint for a Spring Boot application.
#
# On the first start no checkpoint exists yet, so the app is launched with
# `spring.context.checkpoint=onRefresh`: Spring boots the application context and,
# as soon as the refresh finishes, the JVM writes a full process image into
# $CRAC_CHECKPOINT_DIR before CRIU terminates the process. Every subsequent start
# restores that image, bringing the application back in a few tens of milliseconds.
#
# Taking and restoring a checkpoint needs Linux, a CRaC-enabled JDK and elevated
# container privileges (CRIU); see Dockerfile-crac, docker-compose-crac.yml and
# the "Run it with CRaC" section of references/DOCKER.md.
#
# A clean checkpoint requires that nothing holds an open network socket (an open
# JDBC/Redis connection at checkpoint time aborts CRaC). For a database-backed app,
# take the checkpoint with an in-memory profile, or register CRaC resource handlers
# that close pooled connections before the checkpoint and reopen them after restore.
set -eu

CRAC_CHECKPOINT_DIR="${CRAC_CHECKPOINT_DIR:-/opt/crac/checkpoint}"
APP_JAR="${APP_JAR:-/app/app.jar}"

# JVM tuning flags (see Dockerfile-crac). Applied only when the checkpoint is
# created below; a restore (-XX:CRaCRestoreFrom) replays the checkpointed JVM, so
# heap/GC flags cannot be re-specified there. Empty by default so the script also
# works when run outside the image.
JAVA_OPTS="${JAVA_OPTS:-}"

mkdir -p "$CRAC_CHECKPOINT_DIR"

# Restore immediately when a previous checkpoint is present.
if [ -n "$(ls -A "$CRAC_CHECKPOINT_DIR" 2>/dev/null)" ]; then
  echo "[crac] Restoring the application from the checkpoint in $CRAC_CHECKPOINT_DIR"
  exec java -XX:CRaCRestoreFrom="$CRAC_CHECKPOINT_DIR"
fi

echo "[crac] No checkpoint found; starting the app to create one (spring.context.checkpoint=onRefresh)"
# CRIU kills the process once the checkpoint is written, so a non-zero exit code
# here is expected. Inspect the directory rather than the exit code to decide
# whether the checkpoint succeeded.
set +e
java $JAVA_OPTS -XX:CRaCCheckpointTo="$CRAC_CHECKPOINT_DIR" \
  -Dspring.context.checkpoint=onRefresh \
  -jar "$APP_JAR"
checkpoint_status=$?
set -e

if [ -z "$(ls -A "$CRAC_CHECKPOINT_DIR" 2>/dev/null)" ]; then
  echo "[crac] Checkpoint creation failed (exit code $checkpoint_status). See the log above." >&2
  echo "[crac] CRaC needs a CRaC-enabled JDK on Linux and CRIU privileges (run the container" >&2
  echo "[crac] with --privileged or the CHECKPOINT_RESTORE/SYS_PTRACE/SYS_ADMIN capabilities)." >&2
  echo "[crac] An open database/Redis connection at checkpoint time also aborts CRaC; take the" >&2
  echo "[crac] checkpoint with an in-memory profile or close pooled connections via CRaC handlers." >&2
  exit "$checkpoint_status"
fi

echo "[crac] Checkpoint created in $CRAC_CHECKPOINT_DIR; restoring the application"
exec java -XX:CRaCRestoreFrom="$CRAC_CHECKPOINT_DIR"
