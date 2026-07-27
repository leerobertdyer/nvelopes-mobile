const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withRNFBFix(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let contents = fs.readFileSync(podfilePath, "utf-8");

      // 1. Insert $RNFirebaseAsStaticFramework + pre_install block
      //    right after `config = use_native_modules!(config_command)`
      const preInstallBlock = `
  $RNFirebaseAsStaticFramework = true

  pre_install do |installer|
    installer.pod_targets.each do |pod|
      if pod.name.start_with?('RNFB')
        def pod.build_type
          Pod::BuildType.static_library
        end
      end
    end
  end
`;

      if (!contents.includes("$RNFirebaseAsStaticFramework")) {
        contents = contents.replace(
          /(config = use_native_modules!\(config_command\)\n)/,
          `$1${preInstallBlock}`,
        );
      }

      // 2. Insert the post_install target loop right after react_native_post_install(...) call
      const postInstallBlock = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++20'
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'

        if target.name.start_with?('RNFB')
          defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] || ['$(inherited)']
          defs = [defs] unless defs.is_a?(Array)
          defs << 'RCT_REMOVE_LEGACY_ARCH=0' unless defs.include?('RCT_REMOVE_LEGACY_ARCH=0')
          config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs
          config.build_settings['OTHER_CFLAGS'] = '$(inherited) -DRCT_REMOVE_LEGACY_ARCH=0'
        end
      end
    end
`;

      if (
        !contents.includes(
          "CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES",
        )
      ) {
        contents = contents.replace(
          /(react_native_post_install\(\s*installer,\s*config\[:reactNativePath\],\s*:mac_catalyst_enabled => false,\s*:ccache_enabled => ccache_enabled\?\(podfile_properties\),\s*\)\n)/,
          `$1${postInstallBlock}`,
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
};
