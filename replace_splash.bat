@echo off
set "SRC=%~dp0src\assets\icon\favicon.png"

rem List of drawable directories (add/remove as needed)
set "DRAWABLE_DIRS=\
android\app\src\main\res\drawable \
android\app\src\main\res\drawable-land-hdpi \
android\app\src\main\res\drawable-land-mdpi \
android\app\src\main\res\drawable-land-xhdpi \
android\app\src\main\res\drawable-land-xxhdpi \
android\app\src\main\res\drawable-land-xxxhdpi \
android\app\src\main\res\drawable-port-hdpi \
android\app\src\main\res\drawable-port-mdpi \
android\app\src\main\res\drawable-port-xhdpi \
android\app\src\main\res\drawable-port-xxhdpi \
android\app\src\main\res\drawable-port-xxxhdpi \
android\app\src\main\res\drawable-v24"

for %%D in (%DRAWABLE_DIRS%) do (
    if exist "%%D" (
        echo Replacing splash.png in %%D
        copy /Y "%SRC%" "%%D\splash.png" >NUL
    ) else (
        echo Directory %%D does not exist, skipping.
    )
)

echo All splash images have been replaced with favicon.png.
pause
