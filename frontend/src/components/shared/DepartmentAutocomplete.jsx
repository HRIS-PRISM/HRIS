import React, { useMemo } from 'react';
import { Autocomplete, Box, TextField } from '@mui/material';

/**
 * Searchable department picker — drop-in for the old department <Select>s.
 *
 * - Type to filter by code or description.
 * - The list opens directly under the field at the field's own width.
 * - `departments` may be strings ('CCS') or objects ({ code, description }).
 * - `onChange` receives the selected value (a code string), not an event.
 *
 * Props:
 *   value, onChange(value)
 *   departments          string[] | { code, description?, id? }[]
 *   allValue             value of the "All" option ('' by default); null = no "All" option
 *   allLabel             label of the "All" option
 *   extraOptions         extra leading options, e.g. [{ value: '__UNASSIGNED__', label: 'Unassigned' }]
 *   displayField         'code' (default) or 'description' — what the closed field shows
 *   label, placeholder, size, fullWidth, disabled, sx
 *   inputSx              sx applied to the outlined input (match the page's Select styling)
 *   fontSize             base font size for the field and list
 *   TextFieldComponent   styled TextField to render (e.g. a page's ModernTextField)
 *   textFieldProps       extra props for the TextField
 *   startIcon            node shown at the start of the field (e.g. a small icon)
 */
const NO_EXTRA = [];

/** Common extra option for pickers that can filter employees with no department. */
export const DEPT_UNASSIGNED_OPTION = [{ value: "__UNASSIGNED__", label: "Unassigned" }];

export default function DepartmentAutocomplete({
  value,
  onChange,
  departments = [],
  allValue = '',
  allLabel = 'All Departments',
  extraOptions = NO_EXTRA,
  displayField = 'code',
  label,
  placeholder = 'Search department…',
  size = 'small',
  fullWidth = true,
  disabled = false,
  sx,
  inputSx,
  fontSize = '0.8rem',
  TextFieldComponent = TextField,
  textFieldProps,
  startIcon,
}) {
  const options = useMemo(() => {
    const list = [];
    const seen = new Set();
    const push = (o) => {
      const key = String(o.value);
      if (seen.has(key)) return;
      seen.add(key);
      list.push(o);
    };
    if (allValue !== null && allValue !== undefined) {
      push({ value: allValue, code: allLabel, description: '', special: true });
    }
    extraOptions.forEach((o) =>
      push({ value: o.value, code: o.label, description: o.description || '', special: true }),
    );
    (departments || []).forEach((d) => {
      if (d == null) return;
      if (typeof d === 'string' || typeof d === 'number') {
        push({ value: String(d), code: String(d), description: '' });
        return;
      }
      const code = d.code ?? d.value ?? '';
      if (code === '' || code == null) return;
      push({ value: code, code: String(code), description: d.description || d.label || '' });
    });
    return list;
  }, [departments, allValue, allLabel, extraOptions]);

  const selected = useMemo(() => {
    const hit = options.find((o) => String(o.value) === String(value ?? ''));
    if (hit) return hit;
    if (value === '' || value == null) return null;
    // Value not (yet) in the list, e.g. departments still loading.
    return { value, code: String(value), description: '' };
  }, [options, value]);

  const labelOf = (o) => {
    if (!o) return '';
    if (o.special) return o.code;
    return displayField === 'description' && o.description ? o.description : o.code;
  };

  return (
    <Autocomplete
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      disableClearable={selected != null}
      autoHighlight
      openOnFocus
      options={options}
      value={selected}
      onChange={(_, opt) => onChange?.(opt ? opt.value : allValue ?? '')}
      getOptionLabel={labelOf}
      isOptionEqualToValue={(o, v) => String(o.value) === String(v.value)}
      filterOptions={(opts, { inputValue }) => {
        const q = inputValue.trim().toLowerCase();
        // Showing the current selection's label means "not searching yet".
        if (!q || q === labelOf(selected).toLowerCase()) return opts;
        return opts.filter((o) => `${o.code} ${o.description}`.toLowerCase().includes(q));
      }}
      renderOption={(props, o) => {
        const { key, ...rest } = props;
        return (
          <Box
            component="li"
            key={key}
            {...rest}
            sx={{
              display: 'block !important',
              py: '5px !important',
              px: '10px !important',
              lineHeight: 1.25,
              minHeight: 'auto !important',
            }}
          >
            <Box
              sx={{
                fontSize,
                fontWeight: o.special ? 500 : 700,
                fontStyle: o.special ? 'italic' : 'normal',
                color: 'text.primary',
                wordBreak: 'break-word',
              }}
            >
              {o.code}
            </Box>
            {o.description && (
              <Box sx={{ fontSize: `calc(${fontSize} * 0.86)`, color: 'text.secondary', whiteSpace: 'normal' }}>
                {o.description}
              </Box>
            )}
          </Box>
        );
      }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.5,
            borderRadius: '8px',
            border: '1px solid rgba(0,0,0,0.12)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
          },
        },
        listbox: { sx: { maxHeight: 280, py: 0.5 } },
      }}
      noOptionsText={<Box sx={{ fontSize }}>No department found</Box>}
      sx={sx}
      renderInput={(params) => (
        <TextFieldComponent
          {...params}
          {...textFieldProps}
          label={label}
          InputLabelProps={{ ...params.InputLabelProps, ...(textFieldProps?.InputLabelProps || {}) }}
          InputProps={
            startIcon
              ? { ...params.InputProps, startAdornment: <>{startIcon}{params.InputProps.startAdornment}</> }
              : params.InputProps
          }
          placeholder={placeholder}
          onFocus={(e) => e.target.select?.()}
          sx={{
            '& .MuiOutlinedInput-root': { fontSize, ...(inputSx || {}) },
            '& .MuiInputLabel-root': { fontSize },
            ...(textFieldProps?.sx || {}),
          }}
        />
      )}
    />
  );
}
