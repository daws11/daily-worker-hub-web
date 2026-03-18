#!/bin/bash

# Daily Worker Hub - Supabase Backup Script
# Automated backup script for PostgreSQL database and storage
# Usage: ./backup-supabase.sh [--full | --schema-only | --data-only]

set -e  # Exit on error

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load config from .env file if exists
CONFIG_FILE="${SCRIPT_DIR}/backup-config.env"
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "❌ ERROR: Config file not found: $CONFIG_FILE"
    echo "Please copy backup-config.env.example to backup-config.env and configure it"
    exit 1
fi

# Source the config file
source "$CONFIG_FILE"

# Validate required config
if [[ -z "$SUPABASE_PROJECT_REF" ]] || [[ -z "$SUPABASE_DB_URL" ]]; then
    echo "❌ ERROR: Missing required configuration"
    echo "Please set SUPABASE_PROJECT_REF and SUPABASE_DB_URL in $CONFIG_FILE"
    exit 1
fi

# Set defaults
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
LOG_FILE="${LOG_FILE:-$PROJECT_ROOT/logs/backup.log}"
NOTIFICATION_FILE="${NOTIFICATION_FILE:-$PROJECT_ROOT/logs/backup-failures.log}"

# Create directories if they don't exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$(dirname "$NOTIFICATION_FILE")"

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOG_FILE"
}

log_error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] ❌ ERROR: $1" | tee -a "$LOG_FILE" | tee -a "$NOTIFICATION_FILE"
}

log_success() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] ✅ $1" | tee -a "$LOG_FILE"
}

# ============================================================================
# BACKUP FUNCTIONS
# ============================================================================

# Backup full database (schema + data)
backup_full_database() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${BACKUP_DIR}/daily-worker-hub-full-${timestamp}.sql"
    
    log "Starting full database backup..."
    
    # Use pg_dump for full backup
    if pg_dump "$SUPABASE_DB_URL" \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        --verbose \
        > "$backup_file" 2>> "$LOG_FILE"; then
        
        # Compress the backup
        gzip "$backup_file"
        
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        log_success "Full database backup completed: ${backup_file}.gz ($size)"
        echo "${backup_file}.gz"
    else
        log_error "Full database backup failed"
        return 1
    fi
}

# Backup schema only
backup_schema_only() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${BACKUP_DIR}/daily-worker-hub-schema-${timestamp}.sql"
    
    log "Starting schema-only backup..."
    
    if pg_dump "$SUPABASE_DB_URL" \
        --schema-only \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        > "$backup_file" 2>> "$LOG_FILE"; then
        
        gzip "$backup_file"
        
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        log_success "Schema backup completed: ${backup_file}.gz ($size)"
        echo "${backup_file}.gz"
    else
        log_error "Schema backup failed"
        return 1
    fi
}

# Backup data only
backup_data_only() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${BACKUP_DIR}/daily-worker-hub-data-${timestamp}.sql"
    
    log "Starting data-only backup..."
    
    if pg_dump "$SUPABASE_DB_URL" \
        --data-only \
        --no-owner \
        --no-acl \
        > "$backup_file" 2>> "$LOG_FILE"; then
        
        gzip "$backup_file"
        
        local size=$(du -h "${backup_file}.gz" | cut -f1)
        log_success "Data backup completed: ${backup_file}.gz ($size)"
        echo "${backup_file}.gz"
    else
        log_error "Data backup failed"
        return 1
    fi
}

# Backup storage bucket metadata (using Supabase CLI if available)
backup_storage_metadata() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="${BACKUP_DIR}/daily-worker-hub-storage-${timestamp}.json"
    
    log "Starting storage metadata backup..."
    
    # Check if supabase CLI is available
    if ! command -v supabase &> /dev/null; then
        log "⚠️  Supabase CLI not found, skipping storage metadata backup"
        return 0
    fi
    
    # Export storage buckets and objects metadata
    # Note: This requires supabase CLI to be authenticated
    if supabase storage list --project-ref "$SUPABASE_PROJECT_REF" > "$backup_file" 2>> "$LOG_FILE"; then
        local size=$(du -h "$backup_file" | cut -f1)
        log_success "Storage metadata backup completed: $backup_file ($size)"
        echo "$backup_file"
    else
        log "⚠️  Storage metadata backup failed (non-critical)"
        rm -f "$backup_file"
    fi
}

# ============================================================================
# RETENTION POLICY
# ============================================================================

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm -f "$file"
        deleted_count=$((deleted_count + 1))
        log "Deleted old backup: $file"
    done < <(find "$BACKUP_DIR" \
        -name "daily-worker-hub-*.sql.gz" \
        -type f \
        -mtime +$RETENTION_DAYS \
        -print0 2>> "$LOG_FILE")
    
    # Also clean old storage metadata
    while IFS= read -r -d '' file; do
        rm -f "$file"
        deleted_count=$((deleted_count + 1))
        log "Deleted old backup: $file"
    done < <(find "$BACKUP_DIR" \
        -name "daily-worker-hub-storage-*.json" \
        -type f \
        -mtime +$RETENTION_DAYS \
        -print0 2>> "$LOG_FILE")
    
    if [[ $deleted_count -gt 0 ]]; then
        log_success "Cleaned up $deleted_count old backup(s)"
    else
        log "No old backups to clean up"
    fi
}

# ============================================================================
# NOTIFICATION
# ============================================================================

send_failure_notification() {
    local error_message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Write to failure log
    echo "========================================" >> "$NOTIFICATION_FILE"
    echo "[$timestamp] BACKUP FAILURE NOTIFICATION" >> "$NOTIFICATION_FILE"
    echo "Project: $SUPABASE_PROJECT_REF" >> "$NOTIFICATION_FILE"
    echo "Error: $error_message" >> "$NOTIFICATION_FILE"
    echo "========================================" >> "$NOTIFICATION_FILE"
    echo "" >> "$NOTIFICATION_FILE"
    
    # Optional: Send to webhook (Slack, Discord, etc.)
    if [[ -n "$NOTIFICATION_WEBHOOK" ]]; then
        curl -X POST \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"🚨 Backup Failed for Daily Worker Hub\\nProject: $SUPABASE_PROJECT_REF\\nError: $error_message\"}" \
            "$NOTIFICATION_WEBHOOK" \
            2>> "$LOG_FILE" || true
    fi
    
    log_error "Backup failure notification sent"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    local backup_type="${1:-full}"
    
    log "========================================"
    log "Daily Worker Hub - Supabase Backup"
    log "Type: $backup_type"
    log "========================================"
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump not found. Please install PostgreSQL client tools."
        send_failure_notification "pg_dump not found"
        exit 1
    fi
    
    # Track if any backup fails
    local failed=0
    
    # Run backup based on type
    case "$backup_type" in
        --full)
            if ! backup_full_database; then
                failed=1
            fi
            ;;
        --schema-only)
            if ! backup_schema_only; then
                failed=1
            fi
            ;;
        --data-only)
            if ! backup_data_only; then
                failed=1
            fi
            ;;
        *)
            log "Unknown backup type: $backup_type"
            log "Usage: $0 [--full | --schema-only | --data-only]"
            exit 1
            ;;
    esac
    
    # Backup storage metadata (non-critical, don't fail on error)
    backup_storage_metadata || true
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Report status
    if [[ $failed -eq 1 ]]; then
        send_failure_notification "One or more backup operations failed"
        log "========================================"
        log "Backup completed with errors"
        log "========================================"
        exit 1
    else
        log_success "All backup operations completed successfully"
        log "========================================"
        exit 0
    fi
}

# Run main function with all arguments
main "$@"
