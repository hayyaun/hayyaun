. 'mc-helper\prism-refined\blender-bridge.ps1'
$loadCode = @"
import bpy
def load_final():
    bpy.ops.wm.open_mainfile(filepath=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-matching\prism-best-match.blend')
    return None
bpy.app.timers.register(load_final,first_interval=1.0)
print('Scheduled final scene load')
"@
Invoke-PrismBlender 'execute_code' @{code=$loadCode} | ConvertTo-Json -Depth 8
