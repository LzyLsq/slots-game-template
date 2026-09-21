# Project hook loaded by Cocos cc_common_after_target. Never edits the shared engine.
target_sources(${CC_EXECUTABLE_NAME} PRIVATE
    ${CMAKE_CURRENT_LIST_DIR}/F28Random.h
    ${CMAKE_CURRENT_LIST_DIR}/F28Random.mm
    ${CMAKE_CURRENT_LIST_DIR}/F28SceneDelegate.h
    ${CMAKE_CURRENT_LIST_DIR}/F28SceneDelegate.mm)
target_link_libraries(${CC_EXECUTABLE_NAME} "-framework Security")
# Replace only the legacy iOS Screen implementation in this project's build.
# The checked-in copy retains upstream code/license except the orientation fix.
get_target_property(f28_engine_sources cocos_engine SOURCES)
list(LENGTH f28_engine_sources f28_source_count)
list(FILTER f28_engine_sources EXCLUDE REGEX "/platform/ios/modules/Screen\\.mm$")
list(LENGTH f28_engine_sources f28_patched_count)
math(EXPR f28_expected_count "${f28_source_count} - 1")
if(NOT f28_patched_count EQUAL f28_expected_count)
    message(FATAL_ERROR "Expected one Cocos iOS Screen source; reassess F28 override after engine updates")
endif()
set_property(TARGET cocos_engine PROPERTY SOURCES "${f28_engine_sources}")
target_sources(cocos_engine PRIVATE ${CMAKE_CURRENT_LIST_DIR}/F28SceneScreen.mm)
# Project lifecycle owners use ARC; do not change shared engine memory mode.
set_source_files_properties(${CMAKE_CURRENT_LIST_DIR}/F28SceneDelegate.mm
    ${CMAKE_CURRENT_LIST_DIR}/AppDelegate.mm
    ${CMAKE_CURRENT_LIST_DIR}/F28SceneScreen.mm
    PROPERTIES COMPILE_FLAGS "-fobjc-arc")

if(CMAKE_OSX_SYSROOT MATCHES "iphonesimulator")
    if(XCODE_VERSION VERSION_GREATER_EQUAL "27.0")
        # Legacy bundled Enoki specializes arithmetic traits. Keep diagnostics
        # visible but non-fatal while validating this unchanged engine locally.
        target_compile_options(cocos_engine PRIVATE -Wno-error=invalid-specialization)
    endif()
    set_target_properties(${CC_EXECUTABLE_NAME} PROPERTIES
        OSX_ARCHITECTURES "arm64"
        XCODE_ATTRIBUTE_CODE_SIGNING_ALLOWED NO
        XCODE_ATTRIBUTE_CODE_SIGNING_REQUIRED NO
        XCODE_ATTRIBUTE_CODE_SIGN_IDENTITY "")
    set(CMAKE_XCODE_ATTRIBUTE_EXCLUDED_ARCHS[sdk=iphonesimulator*] "")
    set(CMAKE_XCODE_ATTRIBUTE_ARCHS[sdk=iphonesimulator*] "arm64")
    set(CMAKE_XCODE_ATTRIBUTE_VALID_ARCHS[sdk=iphonesimulator*] "arm64")

    # Creator 3.8.8 defaults to device/x86_64 libraries. Repoint existing imported
    # targets to its bundled arm64 Simulator siblings without redefining targets.
    get_property(f28_imported DIRECTORY PROPERTY IMPORTED_TARGETS)
    foreach(f28_target IN LISTS f28_imported)
        get_target_property(f28_location ${f28_target} IMPORTED_LOCATION)
        if(f28_location MATCHES "/external/ios/")
            string(REPLACE "/external/ios/" "/external/ios-m1-simulator/" f28_sim_location "${f28_location}")
            if(EXISTS "${f28_sim_location}")
                set_target_properties(${f28_target} PROPERTIES IMPORTED_LOCATION "${f28_sim_location}")
            endif()
        endif()
    endforeach()
endif()
