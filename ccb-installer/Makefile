.PHONY: all resources installer test clean

NSIS = makensis

all: resources installer

resources:
	@echo "Downloading resources (Bun + ripgrep)..."
	pwsh -ExecutionPolicy Bypass -File scripts/build-resources.ps1

installer: resources
	@echo "Building installer..."
	$(NSIS) installer.nsi

test:
	@echo "Verifying installation..."
	pwsh -ExecutionPolicy Bypass -File scripts/verify-installer.ps1

clean:
	@echo "Cleaning resources..."
	rm -rf resources/bun/*
	rm -rf resources/ripgrep/*
	rm -f CCB-Setup-*.exe
	@echo "Done!"

.PHONY: install-test
install-test:
	@echo "Installing for testing..."
	.\CCB-Setup-1.0.0.exe /S
	@echo "Waiting for installation to complete..."
	timeout /t 5
	pwsh -ExecutionPolicy Bypass -File scripts/verify-installer.ps1

.PHONY: uninstall-test
uninstall-test:
	@echo "Uninstalling..."
	"%LOCALAPPDATA%\Programs\CCB\uninstall.exe" /S