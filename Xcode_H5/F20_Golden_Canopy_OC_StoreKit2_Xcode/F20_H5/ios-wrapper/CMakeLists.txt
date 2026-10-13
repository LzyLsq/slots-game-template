cmake_minimum_required(VERSION 3.20)

project(GoldenCanopyH5 LANGUAGES C OBJC Swift)

set(CMAKE_OSX_DEPLOYMENT_TARGET "15.0" CACHE STRING "Minimum iOS version" FORCE)

set(WEB_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/..")

file(GLOB_RECURSE H5_RESOURCE_FILES CONFIGURE_DEPENDS
    "${WEB_ROOT}/assets/*"
    "${WEB_ROOT}/cocos-js/*"
    "${WEB_ROOT}/src/*"
)

set(H5_ENTRY_FILES
    "${WEB_ROOT}/index.html"
    "${WEB_ROOT}/bootstrap.js"
    "${WEB_ROOT}/index.js"
    "${WEB_ROOT}/application.js"
    "${WEB_ROOT}/style.css"
    "${WEB_ROOT}/legal.css"
    "${WEB_ROOT}/privacy.html"
    "${WEB_ROOT}/terms.html"
    "${WEB_ROOT}/support.html"
    "${WEB_ROOT}/canopy-arrival.webp"
    "${WEB_ROOT}/canopy-brand.webp"
    "${WEB_ROOT}/canopy-destination.webp"
)

set(APP_SOURCES
    App/main.m
    App/AppDelegate.m
    App/LocalStore.m
    App/StoreKitBackend.swift
    App/AppleLogin.m
    App/H5LocalServer.m
    App/CopyWebAssets.sh
    App/Assets.xcassets
    App/PrivacyInfo.xcprivacy
)

add_executable(GoldenCanopyH5Host MACOSX_BUNDLE
    ${APP_SOURCES}
    ${H5_RESOURCE_FILES}
    ${H5_ENTRY_FILES}
)

set_source_files_properties(
    ${H5_RESOURCE_FILES}
    ${H5_ENTRY_FILES}
    PROPERTIES HEADER_FILE_ONLY TRUE
)

source_group(TREE "${WEB_ROOT}" PREFIX "H5 Resources" FILES
    ${H5_RESOURCE_FILES}
    ${H5_ENTRY_FILES}
)

set_source_files_properties(
    App/Assets.xcassets
    App/PrivacyInfo.xcprivacy
    PROPERTIES MACOSX_PACKAGE_LOCATION Resources
)

target_link_libraries(GoldenCanopyH5Host PRIVATE
    "-framework UIKit"
    "-framework WebKit"
    "-framework StoreKit"
    "-framework AuthenticationServices"
)

set_target_properties(GoldenCanopyH5Host PROPERTIES
    OUTPUT_NAME "GoldenCanopyH5"
    MACOSX_BUNDLE TRUE
    MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_SOURCE_DIR}/App/Info.plist.in"
    XCODE_ATTRIBUTE_PRODUCT_BUNDLE_IDENTIFIER "com.xzkj.goldencanopyh5"
    XCODE_ATTRIBUTE_TARGETED_DEVICE_FAMILY "1,2"
    XCODE_ATTRIBUTE_ASSETCATALOG_COMPILER_APPICON_NAME "AppIcon"
    XCODE_ATTRIBUTE_CODE_SIGN_STYLE "Automatic"
    XCODE_ATTRIBUTE_CODE_SIGN_ENTITLEMENTS "${CMAKE_CURRENT_SOURCE_DIR}/App/GoldenCanopy.entitlements"
    XCODE_ATTRIBUTE_SWIFT_VERSION "5.0"
    XCODE_ATTRIBUTE_ENABLE_TESTABILITY "YES"
    XCODE_ATTRIBUTE_SWIFT_OBJC_INTERFACE_HEADER_NAME "GoldenCanopyH5Host-Swift.h"
    XCODE_ATTRIBUTE_CLANG_ENABLE_OBJC_ARC "YES"
    XCODE_ATTRIBUTE_IPHONEOS_DEPLOYMENT_TARGET "15.0"
)

add_library(GoldenCanopyTests MODULE App/StoreTests.swift App/GoldenCanopy.storekit)
set_source_files_properties(App/GoldenCanopy.storekit PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
add_dependencies(GoldenCanopyTests GoldenCanopyH5Host)
set_target_properties(GoldenCanopyTests PROPERTIES
    BUNDLE TRUE
    XCTEST TRUE
    XCODE_PRODUCT_TYPE "com.apple.product-type.bundle.unit-test"
    XCODE_ATTRIBUTE_PRODUCT_BUNDLE_IDENTIFIER "com.xzkj.goldencanopyh5.tests"
    XCODE_ATTRIBUTE_GENERATE_INFOPLIST_FILE "YES"
    XCODE_ATTRIBUTE_SWIFT_VERSION "5.0"
    XCODE_ATTRIBUTE_IPHONEOS_DEPLOYMENT_TARGET "15.0"
    XCODE_ATTRIBUTE_FRAMEWORK_SEARCH_PATHS "$(inherited) $(PLATFORM_DIR)/Developer/Library/Frameworks"
    XCODE_ATTRIBUTE_SWIFT_INCLUDE_PATHS "${CMAKE_CURRENT_BINARY_DIR}/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)"
    XCODE_ATTRIBUTE_TEST_HOST "${CMAKE_CURRENT_BINARY_DIR}/$(CONFIGURATION)$(EFFECTIVE_PLATFORM_NAME)/GoldenCanopyH5.app/GoldenCanopyH5"
    XCODE_ATTRIBUTE_BUNDLE_LOADER "$(TEST_HOST)"
    XCODE_ATTRIBUTE_CODE_SIGN_STYLE "Automatic"
)
target_link_libraries(GoldenCanopyTests PRIVATE "-framework XCTest" "-framework StoreKitTest")

add_custom_command(TARGET GoldenCanopyH5Host POST_BUILD
    COMMAND /bin/sh "${CMAKE_CURRENT_SOURCE_DIR}/App/CopyWebAssets.sh" "${WEB_ROOT}"
    VERBATIM
)
