. 'mc-helper\prism-refined\blender-bridge.ps1'
$renderCode = @"
import bpy,subprocess,os
out=r'\\wsl$\Ubuntu\home\garfield\projects\hayyaun\mc-helper\prism-matching'
p=subprocess.Popen([bpy.app.binary_path,'-b',os.path.join(out,'lean-curved.blend'),'-t','6','--python',os.path.join(out,'finalize-curved.py')],stdout=open(os.path.join(out,'finalize-curved.log'),'w'),stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
print(p.pid)
"@
Invoke-PrismBlender 'execute_code' @{code=$renderCode} | ConvertTo-Json -Depth 8
