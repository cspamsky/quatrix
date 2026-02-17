#!/bin/bash

# ==============================================================================
# QUATRIX - UNINSTALLATION SCRIPT
# ==============================================================================
# This script reverses the Quatrix installation:
# 1. Stops and removes the systemd service
# 2. Removes UFW firewall rules (EXCEPT SSH)
# 3. Removes MariaDB user
# 4. Cleans up Nginx and phpMyAdmin config
# 5. Deletes the 'quatrix' user and installation directory
# ==============================================================================

set -e

# ANSI Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BRIGHT='\033[1m'
NC='\033[0m'

log() { echo -e "${BLUE}${BRIGHT}[QUATRIX-UNINSTALL]${NC} $1"; }
info() { echo -e "${CYAN}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}${BRIGHT}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 1. Root Check
if [ "$EUID" -ne 0 ]; then
  error "Please run as root (use sudo bash uninstall.sh)"
  exit 1
fi

echo -e "${RED}${BRIGHT}============================================================${NC}"
echo -e "${RED}${BRIGHT}          QUATRIX - UNINSTALLATION MODULE${NC}"
echo -e "${RED}${BRIGHT}============================================================${NC}"
warn "This will DELETE the quatrix user, all data, and configurations."
read -p "Are you sure you want to proceed? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    info "Uninstallation aborted."
    exit 0
fi

# 2. Service Management
info "Stopping and disabling Quatrix service..."
systemctl stop quatrix || true
systemctl disable quatrix || true
if [ -f /etc/systemd/system/quatrix.service ]; then
    rm /etc/systemd/system/quatrix.service
    systemctl daemon-reload
    success "Systemd service removed."
fi

# 3. Firewall Configuration
info "Removing UFW firewall rules..."
# Explicitly removing port 22 from cleanup to ensure SSH safety
ufw delete allow 3001/tcp || true
ufw delete allow 80/tcp || true
ufw delete allow 8080/tcp || true
ufw delete allow 27015:27050/udp || true
ufw delete allow 27015:27050/tcp || true
# Port 22 remains untouched
success "Firewall rules cleaned (SSH port 22 preserved)."

# 4. Sudoers Cleanup
if [ -f /etc/sudoers.d/quatrix-panel ]; then
    rm /etc/sudoers.d/quatrix-panel
    success "Sudoers permissions removed."
fi

# 5. Database Cleanup
info "Removing MariaDB 'quatrix_admin' user..."
# Trying to get user from .env if it exists in current dir
DB_USER="quatrix_admin"
if [ -f .env ]; then
    ENV_USER=$(grep MYSQL_ROOT_USER .env | cut -d '=' -f2)
    if [ ! -z "$ENV_USER" ]; then DB_USER="$ENV_USER"; fi
fi

mysql -u root -e "DROP USER IF EXISTS '$DB_USER'@'localhost';" || warn "Could not remove database user '$DB_USER'."
mysql -u root -e "FLUSH PRIVILEGES;"
success "Database permissions cleaned."

# 6. Nginx & phpMyAdmin Cleanup
info "Cleaning up web server configuration..."
if [ -f /etc/nginx/sites-enabled/phpmyadmin ]; then
    rm /etc/nginx/sites-enabled/phpmyadmin
fi
if [ -f /etc/nginx/sites-available/phpmyadmin ]; then
    rm /etc/nginx/sites-available/phpmyadmin
fi
systemctl restart nginx || true
success "Web server configuration removed."

# 7. User and Directory Removal
info "Deleting 'quatrix' user and all related data..."
if id "quatrix" &>/dev/null; then
    userdel -r quatrix || warn "userdel encountered issues, but proceeding."
    success "Kullanıcı 'quatrix' ve /home/quatrix başarıyla silindi."
else
    warn "User 'quatrix' not found. Manually checking /home/quatrix..."
    rm -rf /home/quatrix
fi

# 8. Optional Package Removal
echo -e "\n${YELLOW}${BRIGHT}--- OPTIONAL PACKAGE REMOVAL ---${NC}"
read -p "Do you want to remove installed packages (Node.js 20, MariaDB, phpMyAdmin, .NET 8)? (y/N): " pkg_confirm
if [[ $pkg_confirm =~ ^[Yy]$ ]]; then
    info "Removing packages..."
    apt-get purge -y nodejs mariadb-server mariadb-client phpmyadmin dotnet-runtime-8.0 || true
    apt-get autoremove -y || true
    success "Packages purged."
fi

echo -e "\n${GREEN}${BRIGHT}============================================================${NC}"
success "UNINSTALLATION COMPLETE!"
info "Quatrix and its components have been removed from your system."
echo -e "${GREEN}${BRIGHT}============================================================${NC}\n"
