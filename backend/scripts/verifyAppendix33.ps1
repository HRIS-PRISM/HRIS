# Opens a filled Appendix 33 workbook in Excel, forces a full recalculation, and reports
# formula errors plus any requested cell values as JSON on stdout.
#
# Excel is the only thing that can evaluate this workbook properly: the PAY sheets call
# the VBA function PesosInWords2Caps, which no headless converter implements.
#
#   powershell -ExecutionPolicy Bypass -File backend/scripts/verifyAppendix33.ps1 `
#       -File "C:\path\to\out.xlsm" [-Cells "SUMMARY!D22,CAS - PAY!R22"] [-Json]
#
# Exit code is 0 when no formula error cells were found, 1 otherwise.

param(
    [Parameter(Mandatory = $true)][string]$File,
    [string]$Cells = '',
    [switch]$Json,
    # Macros stay off by default: loading the VBA project through COM destabilises
    # Excel across repeated automated runs. The cost is that the PAY sheets'
    # PesosInWords2Caps cells report #NAME?, so compare error counts against a baseline
    # run of a known-good workbook under the same setting rather than against zero.
    [switch]$EnableMacros
)

$ErrorActionPreference = 'Stop'

$xlCellTypeFormulas = -4123
$xlErrors = 16
$msoAutomationSecurityForceDisable = 3
$msoAutomationSecurityLow = 1

$File = [System.IO.Path]::GetFullPath($File)
if (-not (Test-Path $File)) { throw "Workbook not found: $File" }

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false
$xl.AskToUpdateLinks = $false
$xl.AutomationSecurity = if ($EnableMacros) { $msoAutomationSecurityLow } else { $msoAutomationSecurityForceDisable }
$xl.EnableEvents = $false
$xl.Interactive = $false
$xl.ScreenUpdating = $false

$wb = $null
try {
    # UpdateLinks=0, ReadOnly, IgnoreReadOnlyRecommended, no Notify, normal (non-repair) load.
    $wb = $xl.Workbooks.Open($File, 0, $true, [Type]::Missing, [Type]::Missing, [Type]::Missing,
        $true, [Type]::Missing, [Type]::Missing, [Type]::Missing, [Type]::Missing,
        [Type]::Missing, $false, [Type]::Missing, 0)
    $xl.CalculateFullRebuild()

    $errorCells = @()
    foreach ($ws in $wb.Worksheets) {
        $used = $ws.UsedRange
        if ($null -eq $used) { continue }
        try {
            $found = $used.SpecialCells($xlCellTypeFormulas, $xlErrors)
        } catch {
            $found = $null   # SpecialCells throws when nothing matches
        }
        if ($null -ne $found) {
            foreach ($cell in $found) {
                $errorCells += [pscustomobject]@{
                    sheet = $ws.Name
                    cell  = $cell.Address($false, $false)
                    text  = $cell.Text
                }
            }
        }
    }

    $values = @{}
    if ($Cells -ne '') {
        foreach ($spec in $Cells.Split(',')) {
            $spec = $spec.Trim()
            if ($spec -eq '') { continue }
            $split = $spec.LastIndexOf('!')
            $sheetName = $spec.Substring(0, $split)
            $addr = $spec.Substring($split + 1)
            $ws = $wb.Worksheets.Item($sheetName)
            $range = $ws.Range($addr)
            $values[$spec] = [pscustomobject]@{
                value = $range.Value2
                text  = $range.Text
            }
        }
    }

    $result = [pscustomobject]@{
        file           = $File
        errorCellCount = $errorCells.Count
        errorCells     = @($errorCells | Select-Object -First 40)
        values         = $values
    }

    if ($Json) {
        $result | ConvertTo-Json -Depth 6 -Compress
    } else {
        Write-Host "file            : $File"
        Write-Host "formula errors  : $($errorCells.Count)"
        foreach ($e in ($errorCells | Select-Object -First 40)) {
            Write-Host ("  {0}!{1} = {2}" -f $e.sheet, $e.cell, $e.text)
        }
        if ($values.Count -gt 0) {
            Write-Host 'values:'
            foreach ($k in $values.Keys | Sort-Object) {
                Write-Host ("  {0,-32} = {1}" -f $k, $values[$k].value)
            }
        }
    }

    if ($errorCells.Count -gt 0) { exit 1 }
}
finally {
    # Excel can die mid-open; tearing down must never mask the original failure.
    try { if ($wb) { $wb.Close($false) | Out-Null } } catch {}
    try { $xl.Quit() } catch {}
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null } catch {}
    [GC]::Collect()
}
