require 'xcodeproj'
require 'fileutils'

root = File.expand_path(__dir__)
proj_path = File.join(root, 'AzusaPlayerNative.xcodeproj')
FileUtils.rm_rf(proj_path) if File.exist?(proj_path)
project = Xcodeproj::Project.new(proj_path)

target = project.new_target(:application, 'AzusaPlayerNative', :ios, '17.0')

sources_group = project.main_group.new_group('AzusaPlayerNative', '.')

Dir.glob(File.join(root, '**', '*.swift')).sort.each do |file|
  relative = file.sub("#{root}/", '')
  sources_group.new_file(relative)
end

resources_group = sources_group.find_subpath('Resources', true)
resources_group.new_file('Resources/Info.plist')

target.build_configurations.each do |config|
  settings = config.build_settings
  settings['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.kenmingwang.azusaplayer.native'
  settings['SWIFT_VERSION'] = '5.0'
  settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
  settings['INFOPLIST_FILE'] = 'Resources/Info.plist'
  settings['CODE_SIGN_STYLE'] = 'Automatic'
  settings['DEVELOPMENT_TEAM'] = ''
  settings['TARGETED_DEVICE_FAMILY'] = '1'
  settings['ENABLE_PREVIEWS'] = 'YES'
  settings['ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS'] = 'YES'
end

project.root_object.attributes['TargetAttributes'] ||= {}
project.root_object.attributes['TargetAttributes'][target.uuid] = {
  'CreatedOnToolsVersion' => '16.4'
}

project.save
puts "Generated #{proj_path}"
