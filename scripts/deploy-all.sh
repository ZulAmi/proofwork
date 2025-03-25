#!/bin/bash
# filepath: j:\Programming\proofwork\scripts\deploy-all.sh

# ===== Configuration =====
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONTRACTS_DIR="${PROJECT_ROOT}/contracts"
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
FRONTEND_BUILD_DIR="${FRONTEND_DIR}/.next"
LOGS_DIR="${PROJECT_ROOT}/logs"
DEPLOY_LOG="${LOGS_DIR}/deployment-$(date +%Y%m%d-%H%M%S).log"
PINATA_API_KEY="${PINATA_API_KEY:-}"
PINATA_SECRET_KEY="${PINATA_SECRET_KEY:-}"
WEB3_STORAGE_TOKEN="${WEB3_STORAGE_TOKEN:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
NETWORK="${NETWORK:-localhost}"
MAX_RETRIES=3
RETRY_DELAY=5

# ===== Color definitions =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# ===== Helper functions =====
function log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$DEPLOY_LOG"
}

function log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$DEPLOY_LOG"
}

function log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$DEPLOY_LOG"
}

function log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$DEPLOY_LOG"
}

function log_step() {
    echo -e "\n${PURPLE}====== $1 ======${NC}" | tee -a "$DEPLOY_LOG"
}

function display_spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

function check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 could not be found. Please install it first."
        exit 1
    fi
}

function check_dependencies() {
    log_step "Checking dependencies"
    
    local dependencies=("npm" "node" "npx" "jq" "curl" "hardhat" "vercel")
    
    for dep in "${dependencies[@]}"; do
        log_info "Checking for $dep..."
        check_command "$dep"
    done
    
    # Check Node.js version
    local node_version=$(node -v | cut -d 'v' -f 2)
    local major_version=$(echo "$node_version" | cut -d '.' -f 1)
    
    if [ "$major_version" -lt 16 ]; then
        log_warning "Node.js version $node_version detected. This script recommends Node.js v16 or higher."
    else
        log_success "Node.js version $node_version detected."
    fi
    
    # Check for environment variables
    if [ -z "$PINATA_API_KEY" ] || [ -z "$PINATA_SECRET_KEY" ]; then
        if [ -z "$WEB3_STORAGE_TOKEN" ]; then
            log_warning "Neither Pinata nor Web3.storage credentials found. IPFS upload will be skipped."
        else
            log_info "Web3.storage token found. Will use Web3.storage for IPFS upload."
        fi
    else
        log_info "Pinata credentials found. Will use Pinata for IPFS upload."
    fi
    
    if [ -z "$VERCEL_TOKEN" ]; then
        log_warning "VERCEL_TOKEN not set. Vercel deployment might fail if not logged in."
    else
        log_info "Vercel token found. Will use for deployment."
    fi
    
    # Create logs directory if it doesn't exist
    mkdir -p "$LOGS_DIR"
    
    log_success "All dependencies checked."
}

function deploy_contract() {
    log_step "Deploying smart contract"
    
    if [ ! -d "$CONTRACTS_DIR" ]; then
        log_error "Contracts directory not found at $CONTRACTS_DIR"
        return 1
    fi
    
    cd "$CONTRACTS_DIR"
    
    log_info "Installing contract dependencies..."
    npm install --silent
    
    log_info "Compiling smart contracts..."
    npx hardhat compile
    
    if [ $? -ne 0 ]; then
        log_error "Contract compilation failed."
        return 1
    fi
    
    log_info "Running contract tests..."
    npx hardhat test
    
    if [ $? -ne 0 ]; then
        log_warning "Some tests failed. Proceeding with deployment anyway."
    else
        log_success "All tests passed."
    fi
    
    log_info "Deploying smart contracts to $NETWORK network..."
    local contract_output_file="${LOGS_DIR}/contract-deployment.json"
    
    for i in $(seq 1 $MAX_RETRIES); do
        log_info "Deployment attempt $i/$MAX_RETRIES"
        npx hardhat run scripts/deploy.js --network $NETWORK > "$contract_output_file" 2>> "$DEPLOY_LOG"
        
        if [ $? -eq 0 ]; then
            # Extract contract addresses
            local review_contract=$(grep -o "ReviewSystem deployed to: [0-9a-fA-Fx]\+" "$contract_output_file" | awk '{print $4}')
            local profile_contract=$(grep -o "ProfileRegistry deployed to: [0-9a-fA-Fx]\+" "$contract_output_file" | awk '{print $4}')
            
            if [ -n "$review_contract" ] || [ -n "$profile_contract" ]; then
                log_success "Smart contracts deployed successfully."
                log_info "Review contract: $review_contract"
                log_info "Profile contract: $profile_contract"
                
                # Save contract addresses to be used by backend and frontend
                echo "{\"reviewContract\":\"$review_contract\",\"profileContract\":\"$profile_contract\",\"network\":\"$NETWORK\"}" > "${PROJECT_ROOT}/contract-addresses.json"
                
                # Copy contract addresses to backend and frontend
                cp "${PROJECT_ROOT}/contract-addresses.json" "${BACKEND_DIR}/"
                cp "${PROJECT_ROOT}/contract-addresses.json" "${FRONTEND_DIR}/"
                
                log_success "Contract addresses saved and distributed to backend and frontend."
                return 0
            else
                log_error "Could not extract contract addresses from deployment output."
            fi
        else
            log_error "Contract deployment failed on attempt $i."
        fi
        
        if [ "$i" -lt "$MAX_RETRIES" ]; then
            log_info "Retrying in $RETRY_DELAY seconds..."
            sleep "$RETRY_DELAY"
        fi
    done
    
    log_error "Smart contract deployment failed after $MAX_RETRIES attempts."
    return 1
}

function start_backend() {
    log_step "Starting backend server"
    
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found at $BACKEND_DIR"
        return 1
    fi
    
    cd "$BACKEND_DIR"
    
    log_info "Installing backend dependencies..."
    npm install --silent
    
    log_info "Building backend..."
    npm run build
    
    if [ $? -ne 0 ]; then
        log_error "Backend build failed."
        return 1
    fi
    
    # Check if backend is already running
    if pgrep -f "node.*backend" > /dev/null; then
        log_warning "Backend server is already running. Restarting it..."
        pkill -f "node.*backend"
        sleep 2
    fi
    
    log_info "Starting backend server..."
    npm run start:prod > "${LOGS_DIR}/backend.log" 2>&1 &
    local backend_pid=$!
    
    # Wait for backend to start
    log_info "Waiting for backend to start..."
    local max_wait=30
    local count=0
    
    while [ $count -lt $max_wait ]; do
        if curl -s http://localhost:3001/api/health | grep -q "ok"; then
            log_success "Backend server started successfully. PID: $backend_pid"
            echo "$backend_pid" > "${LOGS_DIR}/backend.pid"
            return 0
        fi
        
        count=$((count+1))
        sleep 1
        echo -n "."
    done
    
    log_error "Backend server failed to start within $max_wait seconds."
    return 1
}

function build_frontend() {
    log_step "Building frontend"
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found at $FRONTEND_DIR"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    log_info "Installing frontend dependencies..."
    npm install --silent
    
    # Update environment variables with contract addresses
    if [ -f "${PROJECT_ROOT}/contract-addresses.json" ]; then
        log_info "Updating frontend environment with contract addresses..."
        
        local review_contract=$(jq -r '.reviewContract' "${PROJECT_ROOT}/contract-addresses.json")
        local profile_contract=$(jq -r '.profileContract' "${PROJECT_ROOT}/contract-addresses.json")
        local network=$(jq -r '.network' "${PROJECT_ROOT}/contract-addresses.json")
        
        # Create or update .env.local file
        echo "NEXT_PUBLIC_REVIEW_CONTRACT_ADDRESS=$review_contract" > .env.local
        echo "NEXT_PUBLIC_PROFILE_CONTRACT_ADDRESS=$profile_contract" >> .env.local
        echo "NEXT_PUBLIC_NETWORK=$network" >> .env.local
        echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" >> .env.local
        
        log_success "Frontend environment updated with contract addresses."
    else
        log_warning "Contract addresses file not found. Frontend might not work correctly."
    fi
    
    log_info "Building frontend..."
    npm run build
    
    if [ $? -ne 0 ]; then
        log_error "Frontend build failed."
        return 1
    fi
    
    log_success "Frontend built successfully."
    return 0
}

function deploy_frontend_vercel() {
    log_step "Deploying frontend to Vercel"
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found at $FRONTEND_DIR"
        return 1
    fi
    
    cd "$FRONTEND_DIR"
    
    # Check if we should use a token
    local vercel_auth=""
    if [ -n "$VERCEL_TOKEN" ]; then
        vercel_auth="--token $VERCEL_TOKEN"
    fi
    
    log_info "Deploying to Vercel..."
    for i in $(seq 1 $MAX_RETRIES); do
        log_info "Deployment attempt $i/$MAX_RETRIES"
        
        # Execute deployment
        vercel deploy --prod $vercel_auth > "${LOGS_DIR}/vercel-deploy.log" 2>&1
        
        if [ $? -eq 0 ]; then
            local deployment_url=$(tail -1 "${LOGS_DIR}/vercel-deploy.log")
            log_success "Frontend deployed to Vercel successfully."
            log_info "Deployment URL: $deployment_url"
            return 0
        else
            log_error "Vercel deployment failed on attempt $i."
            cat "${LOGS_DIR}/vercel-deploy.log" >> "$DEPLOY_LOG"
        fi
        
        if [ "$i" -lt "$MAX_RETRIES" ]; then
            log_info "Retrying in $RETRY_DELAY seconds..."
            sleep "$RETRY_DELAY"
        fi
    done
    
    log_error "Frontend deployment to Vercel failed after $MAX_RETRIES attempts."
    return 1
}

function upload_to_ipfs() {
    log_step "Uploading frontend build to IPFS"
    
    if [ ! -d "$FRONTEND_BUILD_DIR" ]; then
        log_error "Frontend build directory not found at $FRONTEND_BUILD_DIR"
        return 1
    fi
    
    # Create a temporary directory for export
    local export_dir="${PROJECT_ROOT}/temp-export"
    mkdir -p "$export_dir"
    
    # Export the static site
    log_info "Exporting static site..."
    cd "$FRONTEND_DIR"
    npm run export -- -o "$export_dir"
    
    if [ $? -ne 0 ]; then
        log_error "Static export failed."
        rm -rf "$export_dir"
        return 1
    fi
    
    local ipfs_hash=""
    
    # Try Pinata if credentials are available
    if [ -n "$PINATA_API_KEY" ] && [ -n "$PINATA_SECRET_KEY" ]; then
        log_info "Uploading to IPFS via Pinata..."
        
        local pinata_response="${LOGS_DIR}/pinata-response.json"
        
        curl -X POST https://api.pinata.cloud/pinning/pinFromFS \
            -H "pinata_api_key:$PINATA_API_KEY" \
            -H "pinata_secret_api_key:$PINATA_SECRET_KEY" \
            -F "file=@$export_dir" \
            -F "pinataMetadata={\"name\":\"ProofWork-Frontend-$(date +%Y%m%d-%H%M%S)\"}" \
            -o "$pinata_response"
        
        if [ $? -eq 0 ]; then
            ipfs_hash=$(jq -r '.IpfsHash' "$pinata_response")
            
            if [ -n "$ipfs_hash" ] && [ "$ipfs_hash" != "null" ]; then
                log_success "Successfully uploaded to IPFS via Pinata."
                log_info "IPFS Hash: $ipfs_hash"
                log_info "Gateway URL: https://gateway.pinata.cloud/ipfs/$ipfs_hash"
                log_info "Gateway URL: https://ipfs.io/ipfs/$ipfs_hash"
            else
                log_error "Failed to upload to IPFS via Pinata. Response: $(cat "$pinata_response")"
            fi
        else
            log_error "Failed to connect to Pinata API."
        fi
    # Try Web3.storage if token is available
    elif [ -n "$WEB3_STORAGE_TOKEN" ]; then
        log_info "Uploading to IPFS via Web3.storage..."
        
        # Check if web3 CLI is installed
        if ! command -v web3 &> /dev/null; then
            log_info "Installing web3.storage CLI..."
            npm install -g @web3-storage/w3cli
        fi
        
        # Authenticate with Web3.storage
        export WEB3_TOKEN="$WEB3_STORAGE_TOKEN"
        
        # Upload to Web3.storage
        local web3_response="${LOGS_DIR}/web3-response.txt"
        web3 up "$export_dir" > "$web3_response" 2>&1
        
        if [ $? -eq 0 ]; then
            ipfs_hash=$(grep -o "ipfs://[a-zA-Z0-9]\+" "$web3_response" | head -1 | cut -d'/' -f3)
            
            if [ -n "$ipfs_hash" ]; then
                log_success "Successfully uploaded to IPFS via Web3.storage."
                log_info "IPFS Hash: $ipfs_hash"
                log_info "Gateway URL: https://dweb.link/ipfs/$ipfs_hash"
                log_info "Gateway URL: https://ipfs.io/ipfs/$ipfs_hash"
            else
                log_error "Failed to extract IPFS hash from Web3.storage response."
            fi
        else
            log_error "Failed to upload to Web3.storage. Response: $(cat "$web3_response")"
        fi
    else
        log_warning "No IPFS credentials provided. Skipping IPFS upload."
    fi
    
    # Clean up export directory
    rm -rf "$export_dir"
    
    if [ -n "$ipfs_hash" ]; then
        # Save IPFS hash to a file
        echo "{\"ipfsHash\":\"$ipfs_hash\",\"timestamp\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "${PROJECT_ROOT}/ipfs-hash.json"
        return 0
    else
        return 1
    fi
}

function main() {
    echo -e "${WHITE}============================================${NC}"
    echo -e "${WHITE}  PROOFWORK DEPLOYMENT SCRIPT STARTED       ${NC}"
    echo -e "${WHITE}  $(date '+%Y-%m-%d %H:%M:%S')              ${NC}"
    echo -e "${WHITE}============================================${NC}"
    
    local start_time=$(date +%s)
    
    # Initial setup
    check_dependencies
    
    # Deploy steps with error handling
    if deploy_contract; then
        log_success "Contract deployment completed."
    else
        log_error "Contract deployment failed. Exiting."
        exit 1
    fi
    
    if start_backend; then
        log_success "Backend startup completed."
    else
        log_error "Backend startup failed. Exiting."
        exit 1
    fi
    
    if build_frontend; then
        log_success "Frontend build completed."
    else
        log_error "Frontend build failed. Exiting."
        exit 1
    fi
    
    # These steps can fail without stopping the script
    deploy_frontend_vercel || log_warning "Vercel deployment failed but continuing."
    upload_to_ipfs || log_warning "IPFS upload failed but continuing."
    
    # Calculate execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo
    echo -e "${WHITE}============================================${NC}"
    echo -e "${WHITE}  DEPLOYMENT COMPLETED                      ${NC}"
    echo -e "${WHITE}  Duration: ${minutes}m ${seconds}s         ${NC}"
    echo -e "${WHITE}  Log file: ${DEPLOY_LOG}                   ${NC}"
    echo -e "${WHITE}============================================${NC}"
    
    # Display IPFS hash if available
    if [ -f "${PROJECT_ROOT}/ipfs-hash.json" ]; then
        local ipfs_hash=$(jq -r '.ipfsHash' "${PROJECT_ROOT}/ipfs-hash.json")
        echo -e "${CYAN}IPFS Hash: ${ipfs_hash}${NC}"
        echo -e "${CYAN}Gateway URL: https://ipfs.io/ipfs/${ipfs_hash}${NC}"
    fi
    
    # Display contract addresses
    if [ -f "${PROJECT_ROOT}/contract-addresses.json" ]; then
        local review_contract=$(jq -r '.reviewContract' "${PROJECT_ROOT}/contract-addresses.json")
        local profile_contract=$(jq -r '.profileContract' "${PROJECT_ROOT}/contract-addresses.json")
        local network=$(jq -r '.network' "${PROJECT_ROOT}/contract-addresses.json")
        echo
        echo -e "${CYAN}Deployed to network: ${network}${NC}"
        echo -e "${CYAN}Review contract: ${review_contract}${NC}"
        echo -e "${CYAN}Profile contract: ${profile_contract}${NC}"
    fi
    
    return 0
}

# Execute main function
main