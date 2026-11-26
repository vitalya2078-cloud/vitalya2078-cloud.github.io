# Fizpraktikum.exe для Windows 7 и новее: 32-битная программа (работает и в 32-, и в 64-битной Windows).
# Сборка (Visual Studio 2022):
#   cmake -S lw3-desktop/win -B build -A Win32 -DWEBVIEW2_SDK=<папка build/native из NuGet Microsoft.Web.WebView2 1.0.1518.46>
#         -DFZ_VERSION=2.4.0 -DFZ_LICENSE_PUBKEY=<64 знака> [-DFZ_TEST=ON]
#   cmake --build build --config Release
# Перед сборкой: python lw3-desktop/build.py и python lw3-desktop/win/pack.py lw3-desktop/dist lw3-desktop/win/app.pak
cmake_minimum_required(VERSION 3.20)
project(Fizpraktikum LANGUAGES C CXX RC)
set(WEBVIEW2_SDK "" CACHE PATH "build/native из пакета Microsoft.Web.WebView2 1.0.1518.46 (последний с поддержкой Windows 7)")
set(FZ_VERSION "0.0.0" CACHE STRING "версия программы")
set(FZ_LICENSE_PUBKEY "" CACHE STRING "открытый ключ лицензии (64 hex); пусто — проверка лицензии выключена")
option(FZ_TEST "проверочная сборка: порт отладки для автотестов" OFF)
if(NOT CMAKE_SIZEOF_VOID_P EQUAL 4)
  message(FATAL_ERROR "Нужна 32-битная сборка: cmake -A Win32")
endif()
if(NOT EXISTS "${WEBVIEW2_SDK}/include/WebView2.h")
  message(FATAL_ERROR "Не найден WebView2 SDK: укажите -DWEBVIEW2_SDK")
endif()
string(REPLACE "." "," FZ_VER_COMMA "${FZ_VERSION},0")
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded")   # библиотека C++ внутри .exe: не нужен Visual C++ Redistributable
add_executable(Fizpraktikum WIN32 main.cpp license.cpp tweetnacl.c app.rc)
set_property(TARGET Fizpraktikum PROPERTY CXX_STANDARD 17)
target_include_directories(Fizpraktikum PRIVATE "${WEBVIEW2_SDK}/include" "${CMAKE_CURRENT_SOURCE_DIR}")
target_compile_definitions(Fizpraktikum PRIVATE UNICODE _UNICODE WINVER=0x0601 _WIN32_WINNT=0x0601 NOMINMAX
  FZ_VERSION="${FZ_VERSION}" $<$<BOOL:${FZ_LICENSE_PUBKEY}>:FZ_LICENSE_PUBKEY="${FZ_LICENSE_PUBKEY}"> $<$<BOOL:${FZ_TEST}>:FZ_TEST>)
set_source_files_properties(app.rc PROPERTIES COMPILE_DEFINITIONS "FZ_VER_COMMA=${FZ_VER_COMMA};FZ_VER_STR=\"${FZ_VERSION}\"")
target_compile_options(Fizpraktikum PRIVATE $<$<COMPILE_LANGUAGE:CXX>:/utf-8 /W3 /EHsc> $<$<COMPILE_LANGUAGE:C>:/utf-8 /wd4146 /wd4244>)
target_link_libraries(Fizpraktikum PRIVATE "${WEBVIEW2_SDK}/x86/WebView2LoaderStatic.lib" ole32 shell32 shlwapi uuid comdlg32 advapi32 version)
# Windows 7: подсистема 6.01; манифест берём свой из app.rc
target_link_options(Fizpraktikum PRIVATE /SUBSYSTEM:WINDOWS,6.01 /MANIFEST:NO)
