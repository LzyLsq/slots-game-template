# Local unsigned Simulator target. Xcode 27 supports deployment targets >= 15.
if(CMAKE_OSX_SYSROOT MATCHES "iphonesimulator")
    set(TARGET_IOS_VERSION "15.0" CACHE STRING "Target iOS version" FORCE)
endif()
