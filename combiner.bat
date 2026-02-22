@echo off
setlocal enabledelayedexpansion

REM Set output file
set "OUTPUT=combined_output.txt"
echo. > "%OUTPUT%"

REM Loop through relevant file types
for %%F in (html js json css) do (
    for /r %%A in (*.^%%F) do (
        set "SKIP_REASON="

        REM Check for libs folder
        echo %%~fA | findstr /i "\\libs\\" >nul && set "SKIP_REASON=excluded for brevity (libs)"

        REM Check for minified .min.js
        if not defined SKIP_REASON (
            echo %%~xA | findstr /i ".js" >nul && echo %%~nxA | findstr /i "\.min.js$" >nul && set "SKIP_REASON=excluded for brevity (minified)"
        )

        echo.>> "%OUTPUT%"
        echo %%~dpnxA>> "%OUTPUT%"
        echo ^<code^>>> "%OUTPUT%"
        if defined SKIP_REASON (
            echo // !SKIP_REASON!>> "%OUTPUT%"
        ) else (
            type "%%A" >> "%OUTPUT%"
        )
        echo ^</code^>>> "%OUTPUT%"
    )
)

echo.
echo ✅ Output written to %OUTPUT%
pause
