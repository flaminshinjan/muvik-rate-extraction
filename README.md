# Muvik Rate Extraction Tool

Automated rate extraction tool for Maersk shipping rates with enhanced Chromium compatibility.

## Quick Start

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd muvik-rate-extraction

# Install dependencies
pip install -r requirements.txt

# Copy environment file and add credentials
cp .env.example .env
# Edit .env with your Maersk credentials
```

### Usage

#### Test Chromium Login (Recommended First)
```bash
python test_chromium_login.py
```

#### Run Main Rate Extraction
```bash
python src/main.py
```

## Recent Fixes (v1.1.0)

### ✅ Chromium Authentication Issues Fixed
- **403 Forbidden / 401 Unauthorized errors** - Enhanced browser configuration
- **Third-party cookie blocking** - Disabled cookie restrictions  
- **Facebook events errors** - Added compatibility flags
- **DOM ID conflicts** - Multiple selector fallbacks
- **Automation detection** - Hidden webdriver properties

### Key Improvements
- Enhanced user agent spoofing
- Disabled web security for authentication compatibility
- Automatic error detection and retry logic
- Multi-layered page ready detection
- Robust cookie acceptance handling

## Troubleshooting

If you encounter login issues:

1. **Run the test script first**: `python test_chromium_login.py`
2. **Check debug screenshots** in the project directory
3. **Review logs** in the `logs/` directory
4. **Verify credentials** in `.env` file
5. **Handle 2FA manually** when prompted

For detailed troubleshooting, see [CHROMIUM_LOGIN_FIXES.md](CHROMIUM_LOGIN_FIXES.md).

## Project Structure

```
muvik-rate-extraction/
├── src/
│   ├── carriers/
│   │   ├── base.py          # Enhanced browser base class
│   │   └── maersk.py        # Maersk-specific automation
│   │   
│   ├── models/
│   │   └── booking.py       # Booking data models
│   └── main.py             # Main application entry point
├── test_chromium_login.py   # Test script for login fixes
├── logs/                    # Application logs
└── requirements.txt         # Python dependencies
```

## Features

- ✅ Enhanced Chromium compatibility
- ✅ Automated Maersk portal login
- ✅ Manual login support with monitoring
- ✅ Booking form automation
- ✅ Error detection and recovery
- ✅ Debug screenshot generation
- ✅ Comprehensive logging

## Environment Variables

Create a `.env` file with:

```bash
MAERSK_BASE_URL=https://www.maersk.com
MAERSK_USERNAME=your_username
MAERSK_PASSWORD=your_password
```

## Dependencies

- Python 3.11+
- Playwright (Chromium automation)
- Loguru (Enhanced logging)
- asyncio (Async/await support)

## Support

For issues related to:
- **Authentication errors**: Check [CHROMIUM_LOGIN_FIXES.md](CHROMIUM_LOGIN_FIXES.md)
- **Browser compatibility**: Run `python test_chromium_login.py`
- **General bugs**: Check logs in `logs/` directory 